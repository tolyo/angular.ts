export const ngOptionsDirective: (string | (($compile: import("../../core/compile/compile.js").CompileFn, $parse: import("../../core/parse/parse.js").ParseService) => {
    restrict: string;
    terminal: boolean;
    require: string[];
    link: {
        pre: (scope: any, selectElement: any, attr: any, ctrls: any) => void;
        post: (scope: import("../../core/scope/scope.js").Scope, selectElement: Element, attr: any, ctrls: any) => void;
    };
}))[];
