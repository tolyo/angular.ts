export const ngIncludeDirective: (string | (($templateRequest: any, $anchorScroll: import("../../services/anchor-scroll").AnchorScrollFunction, $animate: any) => {
    restrict: string;
    priority: number;
    terminal: boolean;
    transclude: string;
    controller: () => void;
    compile(_element: any, attr: any): (scope: any, $element: any, _$attr: any, ctrl: any, $transclude: any) => void;
}))[];
export const ngIncludeFillContentDirective: (string | (($compile: import("../../core/compile/compile.js").CompileFn) => import("../../types.js").Directive))[];
