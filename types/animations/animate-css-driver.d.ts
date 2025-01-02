export function AnimateCssDriverProvider($$animationProvider: any): void;
export class AnimateCssDriverProvider {
    constructor($$animationProvider: any);
    /**
     * @returns {Function}
     */
    $get: (string | (($animateCss: any, $$AnimateRunner: typeof import("./animate-runner").AnimateRunner, $rootElement: JQLite) => (animationDetails: any) => any))[];
}
export namespace AnimateCssDriverProvider {
    let $inject: string[];
}
import { JQLite } from "../shared/jqlite/jqlite.js";
