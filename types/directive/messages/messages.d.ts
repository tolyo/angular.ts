export function ngMessagesDirective($animate: any): {
    require: string;
    restrict: string;
    controller: ($element: any, $scope: any, $attrs: any) => NgMessageCtrl;
};
export namespace ngMessagesDirective {
    let $inject: string[];
}
export function ngMessagesIncludeDirective($templateRequest: any, $compile: any): {
    restrict: string;
    require: string;
    link($scope: any, element: any, attrs: any): void;
};
export namespace ngMessagesIncludeDirective {
    let $inject_1: string[];
    export { $inject_1 as $inject };
}
export function ngMessageDirective($animate: any): {
    restrict: string;
    transclude: string;
    priority: number;
    terminal: boolean;
    require: string;
    link(scope: any, element: any, attrs: any, ngMessagesCtrl: any, $transclude: any): void;
};
export namespace ngMessageDirective {
    let $inject_2: string[];
    export { $inject_2 as $inject };
}
export function ngMessageExpDirective($animate: any): {
    restrict: string;
    transclude: string;
    priority: number;
    terminal: boolean;
    require: string;
    link(scope: any, element: any, attrs: any, ngMessagesCtrl: any, $transclude: any): void;
};
export namespace ngMessageExpDirective { }
export function ngMessageDefaultDirective($animate: any): {
    restrict: string;
    transclude: string;
    priority: number;
    terminal: boolean;
    require: string;
    link(scope: any, element: any, attrs: any, ngMessagesCtrl: any, $transclude: any): void;
};
export namespace ngMessageDefaultDirective { }
declare class NgMessageCtrl {
    /**
     * @param {import('../../shared/jqlite/jqlite').JQLite} $element
     * @param {import('../../core/scope/scope').Scope} $scope
     * @param {import('../../core/compile/attributes').Attributes} $attrs
     * @param {*} $animate
     */
    constructor($element: import("../../shared/jqlite/jqlite.js").JQLite, $scope: import("../../core/scope/scope").Scope, $attrs: import("../../core/compile/attributes").Attributes, $animate: any);
    $element: import("../../shared/jqlite/jqlite.js").JQLite;
    $scope: import("../../core/scope/scope").Scope;
    $attrs: import("../../core/compile/attributes").Attributes;
    $animate: any;
    latestKey: number;
    nextAttachId: number;
    messages: {};
    renderLater: boolean;
    cachedCollection: {};
    head: any;
    default: any;
    getAttachId(): number;
    render(collection?: {}): void;
    reRender(): void;
    register(comment: any, messageCtrl: any, isDefault: any): void;
    deregister(comment: any, isDefault: any): void;
    findPreviousMessage(parent: any, comment: any): any;
    insertMessageNode(parent: any, comment: any, key: any): void;
    removeMessageNode(parent: any, comment: any, key: any): void;
}
export {};
