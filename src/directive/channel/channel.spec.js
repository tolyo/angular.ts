import { Angular } from "../../loader";
import { EventBus } from "../../core/pubsub/pubsub";
import { wait } from "../../shared/test-utils";

describe("channel", () => {
  let $compile, $scope, element, unsubscribeSpy;

  beforeEach(() => {
    window.angular = new Angular();
    angular.module("myModule", ["ng"]);
    angular
      .bootstrap(document.getElementById("dummy"), ["myModule"])
      .invoke((_$compile_, _$rootScope_) => {
        $compile = _$compile_;
        $scope = _$rootScope_;
      });

    spyOn(EventBus, "subscribe").and.callThrough();
    unsubscribeSpy = spyOn(EventBus, "unsubscribeByKey").and.callThrough();
  });

  it("should subscribe to the specified EventBus channel", () => {
    element = $compile('<div ng-channel="testChannel"></div>')($scope);

    expect(EventBus.subscribe).toHaveBeenCalledWith(
      "testChannel",
      jasmine.any(Function),
    );
  });

  it("should update innerHtml when EventBus emits a value", async () => {
    element = $compile('<div ng-channel="testChannel"></div>')($scope);

    expect(element[0].innerHTML).toBe("");

    EventBus.publish("testChannel", "New Content");
    await wait(10);

    expect(element[0].innerHTML).toBe("New Content");
  });

  it("should unsubscribe from the EventBus when the scope is destroyed", () => {
    element = $compile('<div ng-channel="testChannel"></div>')($scope);

    $scope.$destroy();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
