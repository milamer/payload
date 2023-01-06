import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Switch, withRouter, Redirect } from 'react-router-dom';
import { CompatRoute, useMatch, Navigate } from 'react-router-dom-v5-compat';
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

function LoggedInRoutes() {
  const { user, permissions } = useAuth();
  const locale = useLocale();

  const canAccessAdmin = permissions?.canAccessAdmin;

  const config = useConfig();
  const {
    admin: {
      user: userSlug,
    },
    routes,
    collections,
    globals,
  } = config;


  const trimmedAdminPath = routes.admin.replace(/\/$/, '');

  if (!user) {
    return <Navigate to={`${trimmedAdminPath}/login`} />;
  }
  if (canAccessAdmin === undefined) {
    return <Loading />;
  }

  if (!canAccessAdmin) {
    return <Unauthorized />;
  }

  return (
    <DefaultTemplate>
      <Switch>
        <CompatRoute
          path={`${trimmedAdminPath}/`}
          exact
        >
          <Dashboard />
        </CompatRoute>

        <CompatRoute path={`${trimmedAdminPath}/account`}>
          <DocumentInfoProvider
            collection={collections.find(({ slug }) => slug === userSlug)}
            id={user.id}
          >
            <Account />
          </DocumentInfoProvider>
        </CompatRoute>

        {collections.reduce((collectionRoutes, collection) => {
          const routesToReturn = [
            ...collectionRoutes,
            <CompatRoute
              key={`${collection.slug}-list`}
              path={`${trimmedAdminPath}/collections/${collection.slug}`}
              exact
              render={(routeProps) => {
                if (
                  permissions?.collections?.[collection.slug]?.read?.permission
                ) {
                  return (
                    <List
                      {...routeProps}
                      collection={collection}
                    />
                  );
                }

                return <Unauthorized />;
              }}
            />,
            <CompatRoute
              key={`${collection.slug}-create`}
              path={`${trimmedAdminPath}/collections/${collection.slug}/create`}
              exact
              render={(routeProps) => {
                if (
                  permissions?.collections?.[collection.slug]?.create
                    ?.permission
                ) {
                  return (
                    <DocumentInfoProvider collection={collection}>
                      <Edit
                        {...routeProps}
                        collection={collection}
                      />
                    </DocumentInfoProvider>
                  );
                }

                return <Unauthorized />;
              }}
            />,
            <CompatRoute
              key={`${collection.slug}-edit`}
              path={`${trimmedAdminPath}/collections/${collection.slug}/:id`}
              exact
              render={(routeProps) => {
                const {
                  match: {
                    params: { id },
                  },
                } = routeProps;
                if (
                  permissions?.collections?.[collection.slug]?.read?.permission
                ) {
                  return (
                    <DocumentInfoProvider
                      key={`${collection.slug}-edit-${id}-${locale}`}
                      collection={collection}
                      id={id}
                    >
                      <Edit
                        isEditing
                        {...routeProps}
                        collection={collection}
                      />
                    </DocumentInfoProvider>
                  );
                }

                return <Unauthorized />;
              }}
            />,
          ];

          if (collection.versions) {
            routesToReturn.push(
              <CompatRoute
                key={`${collection.slug}-versions`}
                path={`${trimmedAdminPath}/collections/${collection.slug}/:id/versions`}
                exact
                render={(routeProps) => {
                  if (
                    permissions?.collections?.[collection.slug]?.readVersions
                      ?.permission
                  ) {
                    return (
                      <Versions
                        {...routeProps}
                        collection={collection}
                      />
                    );
                  }

                  return <Unauthorized />;
                }}
              />,
            );

            routesToReturn.push(
              <CompatRoute
                key={`${collection.slug}-view-version`}
                path={`${trimmedAdminPath}/collections/${collection.slug}/:id/versions/:versionID`}
                exact
                render={(routeProps) => {
                  if (
                    permissions?.collections?.[collection.slug]?.readVersions
                      ?.permission
                  ) {
                    return (
                      <Version
                        {...routeProps}
                        collection={collection}
                      />
                    );
                  }

                  return <Unauthorized />;
                }}
              />,
            );
          }

          return routesToReturn;
        }, [])}

        {globals
          && globals.reduce((globalRoutes, global) => {
            const routesToReturn = [
              ...globalRoutes,
              <CompatRoute
                key={`${global.slug}`}
                path={`${trimmedAdminPath}/globals/${global.slug}`}
                exact
                render={(routeProps) => {
                  if (permissions?.globals?.[global.slug]?.read?.permission) {
                    return (
                      <DocumentInfoProvider
                        global={global}
                        key={`${global.slug}-${locale}`}
                      >
                        <EditGlobal
                          {...routeProps}
                          global={global}
                        />
                      </DocumentInfoProvider>
                    );
                  }

                  return <Unauthorized />;
                }}
              />,
            ];

            if (global.versions) {
              routesToReturn.push(
                <CompatRoute
                  key={`${global.slug}-versions`}
                  path={`${trimmedAdminPath}/globals/${global.slug}/versions`}
                  exact
                  render={(routeProps) => {
                    if (
                      permissions?.globals?.[global.slug]?.readVersions
                        ?.permission
                    ) {
                      return (
                        <Versions
                          {...routeProps}
                          global={global}
                        />
                      );
                    }

                    return <Unauthorized />;
                  }}
                />,
              );
              routesToReturn.push(
                <CompatRoute
                  key={`${global.slug}-view-version`}
                  path={`${trimmedAdminPath}/globals/${global.slug}/versions/:versionID`}
                  exact
                  render={(routeProps) => {
                    if (
                      permissions?.globals?.[global.slug]?.readVersions
                        ?.permission
                    ) {
                      return (
                        <Version
                          {...routeProps}
                          global={global}
                        />
                      );
                    }

                    return <Unauthorized />;
                  }}
                />,
              );
            }
            return routesToReturn;
          }, [])}

        <CompatRoute path={`${trimmedAdminPath}/*`}>
          <NotFound />
        </CompatRoute>
      </Switch>
    </DefaultTemplate>
  );
}

function AdminRoute() {
  const [initialized, setInitialized] = useState(null);
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

  const adminMatch = useMatch({
    path: routes.admin,
    end: false,
  });

  if (!adminMatch || initialized === null) {
    return null;
  }

  if (initialized === false) {
    return (
      <Switch>
        <CompatRoute path={`${adminMatch.pathnameBase}create-first-user`}>
          <CreateFirstUser setInitialized={setInitialized} />
        </CompatRoute>
        <CompatRoute>
          <Redirect to={`${adminMatch.pathnameBase}/create-first-user`} />
        </CompatRoute>
      </Switch>
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
    <Switch>
      {Array.isArray(customRoutes)
        && customRoutes.map(({ path, Component, strict, exact, sensitive }) => {
          const trimmedPath = path.replace(/^\//, '');
          return (
            <CompatRoute
              key={trimmedPath}
              path={`${adminMatch.pathnameBase}/${trimmedPath}`}
              strict={strict}
              exact={exact}
              sensitive={sensitive}
            >
              <Component
                user={user}
                canAccessAdmin={canAccessAdmin}
              />
            </CompatRoute>
          );
        })}

      <CompatRoute path={`${adminMatch.pathnameBase}/login`}>
        <Login />
      </CompatRoute>
      <CompatRoute path={`${adminMatch.pathnameBase}/${trimmedLogoutRoute}`}>
        <Logout />
      </CompatRoute>
      <CompatRoute
        path={`${adminMatch.pathnameBase}/${trimmedLogoutInactivityRoute}`}
      >
        <Logout inactivity />
      </CompatRoute>

      {!userCollection.auth.disableLocalStrategy && (
        <CompatRoute path={`${adminMatch.pathnameBase}/forgot`}>
          <ForgotPassword />
        </CompatRoute>
      )}

      {!userCollection.auth.disableLocalStrategy && (
        <CompatRoute path={`${adminMatch.pathnameBase}/reset/:token`}>
          <ResetPassword />
        </CompatRoute>
      )}

      {collections.map((collection) => {
        if (collection?.auth?.verify && !collection.auth.disableLocalStrategy) {
          return (
            <CompatRoute
              key={`${collection.slug}-verify`}
              path={`${adminMatch.pathnameBase}/${collection.slug}/verify/:token`}
              exact
            >
              <Verify collection={collection} />
            </CompatRoute>
          );
        }
        return null;
      })}
      <LoggedInRoutes />
      <CompatRoute path={`${adminMatch.pathnameBase}/*`}>
        <NotFound />
      </CompatRoute>
    </Switch>
  );
}

const Routes = () => {
  const { refreshCookie } = useAuth();

  return (
    <Suspense fallback={<Loading />}>
      <AdminRoute />
      <StayLoggedIn refreshCookie={refreshCookie} />
    </Suspense>
  );
};

export default withRouter(Routes);
