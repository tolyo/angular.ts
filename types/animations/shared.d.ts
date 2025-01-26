export function assertArg(arg: any, name: any, reason: any): any;
export function mergeClasses(a: any, b: any): any;
export function packageStyles(options: any): {
    to: any;
    from: any;
};
export function pendClasses(classes: any, fix: any, isPrefix: any): string;
export function removeFromArray(arr: any, val: any): void;
/**
 *
 * @param {JQLite|Node} element
 * @returns {JQLite}
 */
export function stripCommentsFromElement(element: JQLite | Node): JQLite;
/**
 * @param {JQLite|Node} element
 * @returns {Node}
 */
export function extractElementNode(element: JQLite | Node): Node;
export function applyAnimationClassesFactory(): (element: any, options: any) => void;
export function prepareAnimationOptions(options: any): any;
export function applyAnimationStyles(element: any, options: any): void;
export function applyAnimationFromStyles(element: any, options: any): void;
export function applyAnimationToStyles(element: any, options: any): void;
export function mergeAnimationDetails(element: any, oldAnimation: any, newAnimation: any): any;
export function resolveElementClasses(existing: any, toAdd: any, toRemove: any): {
    addClass: string;
    removeClass: string;
};
export function applyGeneratedPreparationClasses(element: any, event: any, options: any): void;
export function clearGeneratedClasses(element: any, options: any): void;
export function blockKeyframeAnimations(node: any, applyBlock: any): string[];
export function applyInlineStyle(node: any, styleTuple: any): void;
export function concatWithSpace(a: any, b: any): any;
export const ADD_CLASS_SUFFIX: "-add";
export const REMOVE_CLASS_SUFFIX: "-remove";
export const EVENT_CLASS_PREFIX: "ng-";
export const ACTIVE_CLASS_SUFFIX: "-active";
export const PREPARE_CLASS_SUFFIX: "-prepare";
export const NG_ANIMATE_CLASSNAME: "ng-animate";
export const NG_ANIMATE_CHILDREN_DATA: "$$ngAnimateChildren";
export let CSS_PREFIX: string;
export let TRANSITION_PROP: any;
export let TRANSITIONEND_EVENT: any;
export let ANIMATION_PROP: any;
export let ANIMATIONEND_EVENT: any;
export const DURATION_KEY: "Duration";
export const PROPERTY_KEY: 13;
export const DELAY_KEY: "Delay";
export const TIMING_KEY: "TimingFunction";
export const ANIMATION_ITERATION_COUNT_KEY: "IterationCount";
export const ANIMATION_PLAYSTATE_KEY: "PlayState";
export const SAFE_FAST_FORWARD_DURATION_VALUE: 9999;
export const ANIMATION_DELAY_PROP: string;
export const ANIMATION_DURATION_PROP: string;
export const TRANSITION_DELAY_PROP: string;
export const TRANSITION_DURATION_PROP: string;
export const ngMinErr: (arg0: string, ...arg1: any[]) => Error;
import { JQLite } from "../shared/jqlite/jqlite.js";
