AnimateJsDriverProvider.$inject = ["$$animationProvider"];
export function AnimateJsDriverProvider($$animationProvider) {
  $$animationProvider.drivers.push("$$animateJsDriver");
  this.$get = [
    "$$animateJs",
    "$$AnimateRunner",
    function ($$animateJs, $$AnimateRunner) {
      return function initDriverFn(animationDetails) {
        if (animationDetails.from && animationDetails.to) {
          const fromAnimation = prepareAnimation(animationDetails.from);
          const toAnimation = prepareAnimation(animationDetails.to);
          if (!fromAnimation && !toAnimation) return;

          return {
            start() {
              const animationRunners = [];

              if (fromAnimation) {
                animationRunners.push(fromAnimation.start());
              }

              if (toAnimation) {
                animationRunners.push(toAnimation.start());
              }

              $$AnimateRunner.all(animationRunners, done);

              const runner = new $$AnimateRunner({
                end: endFnFactory(),
                cancel: endFnFactory(),
              });

              return runner;

              function endFnFactory() {
                return function () {
                  animationRunners.forEach((runner) => {
                    // at this point we cannot cancel animations for groups just yet. 1.5+
                    runner.end();
                  });
                };
              }

              function done(status) {
                runner.complete(status);
              }
            },
          };
        }
        return prepareAnimation(animationDetails);
      };

      function prepareAnimation(animationDetails) {
        // TODO(matsko): make sure to check for grouped animations and delegate down to normal animations
        const { element } = animationDetails;
        const { event } = animationDetails;
        const { options } = animationDetails;
        const { classes } = animationDetails;
        return $$animateJs(element, event, classes, options);
      }
    },
  ];
}
