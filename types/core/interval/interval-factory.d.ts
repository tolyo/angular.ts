export function $IntervalFactoryProvider(): void;
export class $IntervalFactoryProvider {
    $get: (string | (($q: any, $rootScope: import("../scope/scope").Scope) => (setIntervalFn: any, clearIntervalFn: any) => (fn: any, delay: any, count: any, ...args: any[]) => any))[];
}
