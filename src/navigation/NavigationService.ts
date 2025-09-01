interface TabConfiguration {
  name: string;
  route: string;
  icon: string;
}

interface NavigationValidationResult {
  isValid: boolean;
  missingScreens: string[];
}

interface ScreenConfig {
  component: string;
}

export class NavigationService {
  private currentTab: string = 'MapScreen';

  getTabConfiguration(): TabConfiguration[] {
    return [
      {
        name: 'Map',
        route: 'MapScreen',
        icon: 'map'
      },
      {
        name: 'Itinerary',
        route: 'ItineraryScreen',
        icon: 'calendar'
      },
      {
        name: 'Places',
        route: 'PlacesScreen',
        icon: 'location'
      },
      {
        name: 'Debug',
        route: 'DebugScreen',
        icon: 'bug'
      }
    ];
  }

  validateNavigation(screens: Record<string, ScreenConfig>): NavigationValidationResult {
    const requiredScreens = this.getTabConfiguration().map(tab => tab.route);
    const providedScreens = Object.keys(screens);
    const missingScreens = requiredScreens.filter(screen => !providedScreens.includes(screen));

    return {
      isValid: missingScreens.length === 0,
      missingScreens
    };
  }

  setCurrentTab(route: string): void {
    this.currentTab = route;
  }

  getCurrentTab(): string {
    return this.currentTab;
  }

  getTabDisplayName(route: string): string {
    const tab = this.getTabConfiguration().find(tab => tab.route === route);
    return tab?.name || 'Unknown';
  }
}