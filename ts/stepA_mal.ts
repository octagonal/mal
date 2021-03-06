import { readline } from "./node_readline";

import { Node, MalType, MalString, MalNil, MalList, MalVector, MalHashMap, MalSymbol, MalFunction, isAST, isSeq } from "./types";
import { Env } from "./env";
import * as core from "./core";
import { readStr } from "./reader";
import { prStr } from "./printer";

// READ
function read(str: string): MalType {
    return readStr(str);
}

function quasiquote(ast: MalType): MalType {
    if (!isPair(ast)) {
        return new MalList([MalSymbol.get("quote"), ast]);
    }
    if (!isSeq(ast)) {
        throw new Error(`unexpected token type: ${ast.type}, expected: list or vector`);
    }
    const [arg1, arg2] = ast.list;
    if (arg1.type === Node.Symbol && arg1.v === "unquote") {
        return arg2;
    }
    if (isPair(arg1)) {
        if (!isSeq(arg1)) {
            throw new Error(`unexpected token type: ${arg1.type}, expected: list or vector`);
        }
        const [arg11, arg12] = arg1.list;
        if (arg11.type === Node.Symbol && arg11.v === "splice-unquote") {
            return new MalList([
                MalSymbol.get("concat"),
                arg12,
                quasiquote(new MalList(ast.list.slice(1))),
            ]);
        }
    }

    return new MalList([
        MalSymbol.get("cons"),
        quasiquote(arg1),
        quasiquote(new MalList(ast.list.slice(1))),
    ]);

    function isPair(ast: MalType) {
        if (!isSeq(ast)) {
            return false;
        }

        return 0 < ast.list.length;
    }
}

function isMacro(ast: MalType, env: Env): boolean {
    if (!isSeq(ast)) {
        return false;
    }
    const s = ast.list[0];
    if (s.type !== Node.Symbol) {
        return false;
    }
    const foundEnv = env.find(s);
    if (!foundEnv) {
        return false;
    }

    const f = foundEnv.get(s);
    if (f.type !== Node.Function) {
        return false;
    }

    return f.isMacro;
}

function macroexpand(ast: MalType, env: Env): MalType {
    while (isMacro(ast, env)) {
        if (!isSeq(ast)) {
            throw new Error(`unexpected token type: ${ast.type}, expected: list or vector`);
        }
        const s = ast.list[0];
        if (s.type !== Node.Symbol) {
            throw new Error(`unexpected token type: ${s.type}, expected: symbol`);
        }
        const f = env.get(s);
        if (f.type !== Node.Function) {
            throw new Error(`unexpected token type: ${f.type}, expected: function`);
        }
        ast = f.func(...ast.list.slice(1));
    }

    return ast;
}

function evalAST(ast: MalType, env: Env): MalType {
    switch (ast.type) {
        case Node.Symbol:
            const f = env.get(ast);
            if (!f) {
                throw new Error(`unknown symbol: ${ast.v}`);
            }
            return f;
        case Node.List:
            return new MalList(ast.list.map(ast => evalMal(ast, env)));
        case Node.Vector:
            return new MalVector(ast.list.map(ast => evalMal(ast, env)));
        case Node.HashMap:
            const list: MalType[] = [];
            for (const [key, value] of ast.entries()) {
                list.push(key);
                list.push(evalMal(value, env));
            }
            return new MalHashMap(list);
        default:
            return ast;
    }
}

// EVAL
function evalMal(ast: MalType, env: Env): MalType {
    loop: while (true) {
        if (ast.type !== Node.List) {
            return evalAST(ast, env);
        }

        ast = macroexpand(ast, env);
        if (!isSeq(ast)) {
            return evalAST(ast, env);
        }

        if (ast.list.length === 0) {
            return ast;
        }
        const first = ast.list[0];
        switch (first.type) {
            case Node.Symbol:
                switch (first.v) {
                    case "def!": {
                        const [, key, value] = ast.list;
                        if (key.type !== Node.Symbol) {
                            throw new Error(`unexpected token type: ${key.type}, expected: symbol`);
                        }
                        if (!value) {
                            throw new Error(`unexpected syntax`);
                        }
                        return env.set(key, evalMal(value, env));
                    }
                    case "let*": {
                        env = new Env(env);
                        const pairs = ast.list[1];
                        if (!isSeq(pairs)) {
                            throw new Error(`unexpected token type: ${pairs.type}, expected: list or vector`);
                        }
                        for (let i = 0; i < pairs.list.length; i += 2) {
                            const key = pairs.list[i];
                            const value = pairs.list[i + 1];
                            if (key.type !== Node.Symbol) {
                                throw new Error(`unexpected token type: ${key.type}, expected: symbol`);
                            }
                            if (!key || !value) {
                                throw new Error(`unexpected syntax`);
                            }

                            env.set(key, evalMal(value, env));
                        }
                        ast = ast.list[2];
                        continue loop;
                    }
                    case "quote": {
                        return ast.list[1];
                    }
                    case "quasiquote": {
                        ast = quasiquote(ast.list[1]);
                        continue loop;
                    }
                    case "defmacro!": {
                        const [, key, value] = ast.list;
                        if (key.type !== Node.Symbol) {
                            throw new Error(`unexpected token type: ${key.type}, expected: symbol`);
                        }
                        if (!value) {
                            throw new Error(`unexpected syntax`);
                        }
                        const f = evalMal(value, env);
                        if (f.type !== Node.Function) {
                            throw new Error(`unexpected token type: ${f.type}, expected: function`);
                        }
                        f.isMacro = true;
                        return env.set(key, f);
                    }
                    case "macroexpand": {
                        return macroexpand(ast.list[1], env);
                    }
                    case "try*": {
                        try {
                            return evalMal(ast.list[1], env);
                        } catch (e) {
                            const catchBody = ast.list[2];
                            if (!isSeq(catchBody)) {
                                throw new Error(`unexpected return type: ${catchBody.type}, expected: list or vector`);
                            }
                            const catchSymbol = catchBody.list[0];
                            if (catchSymbol.type === Node.Symbol && catchSymbol.v === "catch*") {
                                const errorSymbol = catchBody.list[1];
                                if (errorSymbol.type !== Node.Symbol) {
                                    throw new Error(`unexpected return type: ${errorSymbol.type}, expected: symbol`);
                                }
                                if (!isAST(e)) {
                                    e = new MalString((e as Error).message);
                                }
                                return evalMal(catchBody.list[2], new Env(env, [errorSymbol], [e]));
                            }
                            throw e;
                        }
                    }
                    case "do": {
                        const list = ast.list.slice(1, -1);
                        evalAST(new MalList(list), env);
                        ast = ast.list[ast.list.length - 1];
                        continue loop;
                    }
                    case "if": {
                        const [, cond, thenExpr, elseExrp] = ast.list;
                        const ret = evalMal(cond, env);
                        let b = true;
                        if (ret.type === Node.Boolean && !ret.v) {
                            b = false;
                        } else if (ret.type === Node.Nil) {
                            b = false;
                        }
                        if (b) {
                            ast = thenExpr;
                        } else if (elseExrp) {
                            ast = elseExrp;
                        } else {
                            ast = MalNil.instance;
                        }
                        continue loop;
                    }
                    case "fn*": {
                        const [, params, bodyAst] = ast.list;
                        if (!isSeq(params)) {
                            throw new Error(`unexpected return type: ${params.type}, expected: list or vector`);
                        }
                        const symbols = params.list.map(param => {
                            if (param.type !== Node.Symbol) {
                                throw new Error(`unexpected return type: ${param.type}, expected: symbol`);
                            }
                            return param;
                        });
                        return MalFunction.fromLisp(evalMal, env, symbols, bodyAst);
                    }
                }
        }
        const result = evalAST(ast, env);
        if (!isSeq(result)) {
            throw new Error(`unexpected return type: ${result.type}, expected: list or vector`);
        }
        const [f, ...args] = result.list;
        if (f.type !== Node.Function) {
            throw new Error(`unexpected token: ${f.type}, expected: function`);
        }
        if (f.ast) {
            ast = f.ast;
            env = f.newEnv(args);
            continue loop;
        }

        return f.func(...args);
    }
}

// PRINT
function print(exp: MalType): string {
    return prStr(exp);
}

const replEnv = new Env();
function rep(str: string): string {
    return print(evalMal(read(str), replEnv));
}

// core.EXT: defined using Racket
core.ns.forEach((value, key) => {
    replEnv.set(key, value);
});
replEnv.set(MalSymbol.get("eval"), MalFunction.fromBootstrap(ast => {
    if (!ast) {
        throw new Error(`undefined argument`);
    }
    return evalMal(ast, replEnv);
}));
replEnv.set(MalSymbol.get("*ARGV*"), new MalList([]));

// core.mal: defined using the language itself
rep(`(def! *host-language* "TypeScript")`);
rep("(def! not (fn* (a) (if a false true)))");
rep(`(def! load-file (fn* (f) (eval (read-string (str "(do " (slurp f) ")")))))`);
rep(`(defmacro! cond (fn* (& xs) (if (> (count xs) 0) (list 'if (first xs) (if (> (count xs) 1) (nth xs 1) (throw "odd number of forms to cond")) (cons 'cond (rest (rest xs)))))))`);
rep("(def! *gensym-counter* (atom 0))");
rep("(def! gensym (fn* [] (symbol (str \"G__\" (swap! *gensym-counter* (fn* [x] (+ 1 x)))))))");
rep("(defmacro! or (fn* (& xs) (if (empty? xs) nil (if (= 1 (count xs)) (first xs) (let* (condvar (gensym)) `(let* (~condvar ~(first xs)) (if ~condvar ~condvar (or ~@(rest xs)))))))))");

if (typeof process !== "undefined" && 2 < process.argv.length) {
    replEnv.set(MalSymbol.get("*ARGV*"), new MalList(process.argv.slice(3).map(s => new MalString(s))));
    rep(`(load-file "${process.argv[2]}")`);
    process.exit(0);
}

rep(`(println (str "Mal [" *host-language* "]"))`);
while (true) {
    const line = readline("user> ");
    if (line == null) {
        break;
    }
    if (line === "") {
        continue;
    }
    try {
        console.log(rep(line));
    } catch (e) {
        const err: Error = e;
        console.error(err.message);
    }
}
