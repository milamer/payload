import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom-v5-compat';
import { useTranslation } from 'react-i18next';
import { useAuth } from './utilities/Auth';
import { useConfig } from './utilities/Config';
import List from './views/collections/List';
import DefaultTemplate from './templates/Default';
import { requests } from '../api';
import Loading from './elements/Loading';
import StayLoggedIn from './modals/StayLoggedIn';
import Versions from './views/Versions';
import Version from './views/Version';
import { DocumentInfoProvider } from './utilities/DocumentInfo';
import { useLocale } from './utilities/Locale';
import { SanitizedCollectionConfig } from '../../collections/config/types';

const Dashboard = lazy(() => import('./views/Dashboard'));
const ForgotPassword = lazy(() => import('./views/ForgotPassword'));
const Login = lazy(() => import('./views/Login'));
const Logout = lazy(() => import('./views/Logout'));
const NotFound = lazy(() => import('./views/NotFound'));
const Verify = lazy(() => import('./views/Verify'));
const CreateFirstUser = lazy(() => import('./views/CreateFirstUser'));
const Edit = lazy(() => import('./views/collections/Edit'));
const EditGlobal = lazy(() => import('./views/Global'));
const ResetPassword = lazy(() => import('./views/ResetPassword'));
const Unauthorized = lazy(() => import('./views/Unauthorized'));
const Account = lazy(() => import('./views/Account'));

function CollectionView({ collection }: { collection: SanitizedCollectionConfig }) {
  const { id } = useParams();

  return (
    <DocumentInfoProvider
      collection={collection}
      id={id}
    >
      <Edit
        isEditing
        collection={collection}
      />
    </DocumentInfoProvider>
  );
}

function LoggedInRoutes() {
  const { user, permissions } = useAuth();
  const locale = useLocale();

  const canAccessAdmin = permissions?.canAccessAdmin;

  const config = useConfig();
  const {
    admin: { user: userSlug },
    collections,
    globals,
  } = config;

  if (!user) {
    return <Navigate to="login" />;
  }
  if (canAccessAdmin === undefined) {
    return <Loading />;
  }

  if (!canAccessAdmin) {
    return <Unauthorized />;
  }

  return (
    <DefaultTemplate>
      <Routes>
        <Route
          path="/"
          element={<Dashboard />}
        />
        <Route
          path="account"
          element={(
            <DocumentInfoProvider
              collection={collections.find(({ slug }) => slug === userSlug)}
              id={user.id}
            >
              <Account />
            </DocumentInfoProvider>
          )}
        />
        <Route
          path="*"
          element={<NotFound />}
        />
        {collections.map((collection) => {
          return (
            <React.Fragment key={collection.slug}>
              <Route
                path={`collections/${collection.slug}`}
                element={
                  permissions?.collections?.[collection.slug]?.read
                    ?.permission ? (
                      <List collection={collection} />
                  ) : (
                    <Unauthorized />
                  )
                }
              />
              <Route
                path={`collections/${collection.slug}/create`}
                element={
                  permissions?.collections?.[collection.slug]?.create
                    ?.permission ? (
                      <DocumentInfoProvider collection={collection}>
                        <Edit collection={collection} />
                      </DocumentInfoProvider>
                  ) : (
                    <Unauthorized />
                  )
                }
              />
              <Route
                path={`collections/${collection.slug}/:id`}
                element={
                  permissions?.collections?.[collection.slug]?.read
                    ?.permission ? (
                      <CollectionView collection={collection} />
                  ) : (
                    <Unauthorized />
                  )
                }
              />
              {collection.versions ? (
                <React.Fragment>
                  <Route
                    path={`collections/${collection.slug}/:id/versions`}
                    element={
                      permissions?.collections?.[collection.slug]?.readVersions
                        ?.permission ? (
                          <Versions collection={collection} />
                      ) : (
                        <Unauthorized />
                      )
                    }
                  />
                  <Route
                    path={`collections/${collection.slug}/:id/versions/:versionID`}
                    element={
                      permissions?.collections?.[collection.slug]?.readVersions
                        ?.permission ? (
                          <Version collection={collection} />
                      ) : (
                        <Unauthorized />
                      )
                    }
                  />
                </React.Fragment>
              ) : null}
            </React.Fragment>
          );
        })}

        {globals.map((global) => {
          return (
            <React.Fragment key={global.slug}>
              <Route
                path={`globals/${global.slug}`}
                element={
                  permissions?.globals?.[global.slug]?.read?.permission ? (
                    <DocumentInfoProvider
                      global={global}
                      key={`${global.slug}-${locale}`}
                    >
                      <EditGlobal global={global} />
                    </DocumentInfoProvider>
                  ) : (
                    <Unauthorized />
                  )
                }
              />

              {global.versions ? (
                <React.Fragment>
                  <Route
                    path={`globals/${global.slug}/versions`}
                    element={
                      permissions?.globals?.[global.slug]?.readVersions
                        ?.permission ? (
                          <Versions global={global} />
                      ) : (
                        <Unauthorized />
                      )
                    }
                  />
                  <Route
                    path={`globals/${global.slug}/versions/:versionID`}
                    element={
                      permissions?.globals?.[global.slug]?.readVersions
                        ?.permission ? (
                          <Version global={global} />
                      ) : (
                        <Unauthorized />
                      )
                    }
                  />
                </React.Fragment>
              ) : null}
            </React.Fragment>
          );
        })}
      </Routes>
    </DefaultTemplate>
  );
}

function AdminRoute() {
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const { user, permissions } = useAuth();
  const { i18n } = useTranslation();

  const canAccessAdmin = permissions?.canAccessAdmin;

  const config = useConfig();
  const {
    admin: {
      user: userSlug,
      logoutRoute,
      inactivityRoute: logoutInactivityRoute,
      components: { routes: customRoutes } = {},
    },
    routes,
    collections,
  } = config;

  const userCollection = collections.find(({ slug }) => slug === userSlug);

  useEffect(() => {
    const { slug } = userCollection;

    if (!userCollection.auth.disableLocalStrategy) {
      requests
        .get(`${routes.api}/${slug}/init`, {
          headers: {
            'Accept-Language': i18n.language,
          },
        })
        .then((res) => res.json().then((data) => {
          if (data && 'initialized' in data) {
            setInitialized(data.initialized);
          }
        }));
    } else {
      setInitialized(true);
    }
  }, [i18n.language, routes, userCollection]);

  if (initialized === null) {
    return null;
  }

  if (initialized === false) {
    return (
      <Routes>
        <Route
          path="create-first-user"
          element={<CreateFirstUser setInitialized={setInitialized} />}
        />
        <Route
          path="*"
          element={<Navigate to="create-first-user" />}
        />
      </Routes>
    );
  }

  if (
    typeof user === 'undefined'
    || (user && typeof canAccessAdmin === 'undefined')
  ) {
    return <Loading />;
  }

  const trimmedLogoutRoute = logoutRoute.replace(/^\//, '');
  const trimmedLogoutInactivityRoute = logoutInactivityRoute.replace(/^\//, '');

  return (
    <Routes>
      {Array.isArray(customRoutes)
        && customRoutes.map(({ path, Component }) => {
          const trimmedPath = path.replace(/^\//, '');
          return (
            <Route
              key={trimmedPath}
              path={trimmedPath}
              element={(
                <Component
                  user={user}
                  canAccessAdmin={canAccessAdmin}
                />
              )}
            />
          );
        })}

      <Route
        path="login"
        element={<Login />}
      />
      <Route
        path={trimmedLogoutRoute}
        element={<Logout />}
      />
      <Route
        path={trimmedLogoutInactivityRoute}
        element={<Logout inactivity />}
      />

      {!userCollection.auth.disableLocalStrategy && (
        <Route
          path="forgot"
          element={<ForgotPassword />}
        />
      )}

      {!userCollection.auth.disableLocalStrategy && (
        <Route
          path="reset/:token"
          element={<ResetPassword />}
        />
      )}

      {collections.map((collection) => {
        if (collection?.auth?.verify && !collection.auth.disableLocalStrategy) {
          return (
            <Route
              key={`${collection.slug}-verify`}
              path={`${collection.slug}/verify/:token`}
              element={<Verify collection={collection} />}
            />
          );
        }
        return null;
      })}
      <Route
        path="*"
        element={<LoggedInRoutes />}
      />
    </Routes>
  );
}

const RoutesWrapper = () => {
  const { refreshCookie } = useAuth();
  const { routes } = useConfig();

  // Remove trailing slash from admin route to avoid double slashes
  const trimmedAdminRoute = routes.admin.replace(/\/$/, '');

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route
          path={`${trimmedAdminRoute}/*`}
          element={<AdminRoute />}
        />
      </Routes>
      <StayLoggedIn refreshCookie={refreshCookie} />
    </Suspense>
  );
};

export default RoutesWrapper;
