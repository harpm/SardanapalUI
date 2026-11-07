/** One sidebar entry. `exact` keeps Home from staying selected on other routes. */
export class DemoNavItem {
  constructor(
    readonly label: string,
    readonly path: string,
    readonly exact = false,
  ) {}
}

/** A labelled group of sidebar entries. */
export class DemoNavGroup {
  constructor(
    readonly title: string,
    readonly items: readonly DemoNavItem[],
  ) {}
}

/** Pages the demo shell lists in the sidebar. */
export class DemoNav {
  static readonly groups: readonly DemoNavGroup[] = [
    new DemoNavGroup('Overview', [new DemoNavItem('Home', '/', true)]),
    new DemoNavGroup('Controls', [
      new DemoNavItem('Text', '/text'),
      new DemoNavItem('Text box', '/text-box'),
      new DemoNavItem('Text area', '/text-area'),
      new DemoNavItem('Numeric', '/numeric'),
      new DemoNavItem('Select', '/select'),
      new DemoNavItem('Date', '/date'),
      new DemoNavItem('Checkbox', '/checkbox'),
      new DemoNavItem('Switch', '/switch'),
      new DemoNavItem('Password', '/password'),
      new DemoNavItem('Grid', '/grid'),
      new DemoNavItem('Login', '/login'),
      new DemoNavItem('Change password', '/change-password'),
      new DemoNavItem('Unauthorized', '/unauthorized'),
<<<<<<< Updated upstream
=======
      new DemoNavItem('Not found', '/not-found'),
>>>>>>> Stashed changes
    ]),
    new DemoNavGroup('Guards', [
      new DemoNavItem('Secure', '/secure'),
      new DemoNavItem('Admin', '/admin'),
    ]),
  ];
}
