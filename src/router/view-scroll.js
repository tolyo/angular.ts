export class ViewScrollProvider {
  constructor() {
    this.enabled = false;
  }

  useAnchorScroll() {
    this.enabled = true;
  }

  $get = [
    "$anchorScroll",
    /**
     * @param {import('../services/anchor-scroll').AnchorScrollObject} $anchorScroll
     * @returns {import('../services/anchor-scroll').AnchorScrollObject|Function}
     */
    ($anchorScroll) => {
      if (this.enabled) {
        return $anchorScroll;
      }
      /**
       * @param {import('../shared/jqlite/jqlite').JQLite} $element
       * @returns {Promise<number>}
       */
      return async function ($element) {
        return setTimeout(
          () => {
            $element[0].scrollIntoView();
          },
          0,
          false,
        );
      };
    },
  ];
}
