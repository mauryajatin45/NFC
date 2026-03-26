import { AppProvider, Frame, Navigation, TopBar } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';
import { useCallback, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, OrderIcon, DeliveryIcon, SettingsIcon } from '@shopify/polaris-icons';

export default function AdminLayout() {
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleMobileNavigationActive = useCallback(
    () => setMobileNavigationActive((active) => !active),
    []
  );

  const topBar = (
    <TopBar
      showNavigationToggle
      onNavigationToggle={toggleMobileNavigationActive}
      userMenu={<div className="p-4 text-sm font-semibold">Admin Panel</div>}
    />
  );

  const navigation = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            label: 'Dashboard',
            icon: HomeIcon,
            onClick: () => navigate('/admin/dashboard'),
            selected: location.pathname === '/admin/dashboard',
          },
          {
            label: 'Orders',
            icon: OrderIcon,
            onClick: () => navigate('/admin/orders'),
            selected: location.pathname === '/admin/orders' || location.pathname.startsWith('/admin/orders/'),
          },
          {
            label: 'Tagged Shipments',
            icon: DeliveryIcon,
            onClick: () => navigate('/admin/tagged-shipments'),
            selected: location.pathname === '/admin/tagged-shipments',
          },
          {
            label: 'Settings',
            icon: SettingsIcon,
            onClick: () => navigate('/admin/settings'),
            selected: location.pathname === '/admin/settings',
          },
        ]}
      />
      <Navigation.Section
        items={[
          {
            label: 'Back to Warehouse Scanner',
            icon: () => (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            ),
            onClick: () => navigate('/'),
          }
        ]}
        separator
      />
    </Navigation>
  );

  return (
    <AppProvider i18n={enTranslations}>
      <Frame
        topBar={topBar}
        navigation={navigation}
        showMobileNavigation={mobileNavigationActive}
        onNavigationDismiss={toggleMobileNavigationActive}
      >
        <Outlet />
      </Frame>
    </AppProvider>
  );
}
