export const ngIfDirective: (string | (($animate: any) => {
    multiElement: boolean;
    transclude: string;
    priority: number;
    terminal: boolean;
    restrict: string;
    link($scope: any, $element: any, $attr: any, ctrl: any, $transclude: any): void;
}))[];
