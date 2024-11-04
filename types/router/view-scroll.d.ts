export class ViewScrollProvider {
    enabled: boolean;
    useAnchorScroll(): void;
    $get: (string | (($anchorScroll: import("../services/anchor-scroll").AnchorScrollObject) => import("../services/anchor-scroll").AnchorScrollObject | Function))[];
}
