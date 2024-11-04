export function AnimateAsyncRunFactoryProvider(): void;
export class AnimateAsyncRunFactoryProvider {
    $get: (() => () => (callback: any) => void)[];
}
export function AnimateRunnerFactoryProvider(): void;
export class AnimateRunnerFactoryProvider {
    $get: (string | ((animateAsyncRun: any) => typeof AnimateRunner))[];
}
export class AnimateRunner {
    static chain(chain: any, callback: any): void;
    static all(runners: any, callback: any): void;
    constructor(host: any);
    _doneCallbacks: any[];
    _tick: (fn: any) => void;
    _state: number;
    setHost(host: any): void;
    host: any;
    done(fn: any): void;
    progress(): void;
    getPromise(): Promise<any>;
    promise: Promise<any>;
    then(resolveHandler: any, rejectHandler: any): Promise<any>;
    catch(handler: any): Promise<any>;
    finally(handler: any): Promise<any>;
    pause(): void;
    resume(): void;
    end(): void;
    cancel(): void;
    complete(response: any): void;
    _resolve(response: any): void;
}
