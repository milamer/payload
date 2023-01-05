import React, { Suspense, lazy, useState, useEffect } from 'react';
import {
  Route, Switch, withRouter, Redirect,
} from 'react-router-dom';
import { CompatRoute } from 'react-router-dom-v5-compat';
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

const Routes = () => {
  const [initialized, setInitialized] = useState(null);
  const { user, permissions, refreshCookie } = useAuth();
  const { i18n } = useTranslation();
  const locale = useLocale();

  const canAccessAdmin = permissions?.canAccessAdmin;

  const config = useConfig();
  const {
    admin: {
      user: userSlug,
      logoutRoute,
      inactivityRoute: logoutInactivityRoute,
      components: {
        routes: customRoutes,
      } = {},
    },
    routes,
    collections,
    globals,
  } = config;


  const userCollection = collections.find(({ slug }) => slug === userSlug);

  useEffect(() => {
    const { slug } = userCollection;

    if (!userCollection.auth.disableLocalStrategy) {
      requests.get(`${routes.api}/${slug}/init`, {
        headers: {
          'Accept-Language': i18n.language,
        },
      }).then((res) => res.json().then((data) => {
        if (data && 'initialized' in data) {
          setInitialized(data.initialized);
        }
      }));
    } else {
      setInitialized(true);
    }
  }, [i18n.language, routes, userCollection]);

  return (
    <Suspense fallback={<Loading />}>
      <Route
        path={routes.admin}
        render={({ match }) => {
          if (initialized === false) {
            return (
              <Switch>
                <CompatRoute path={`${match.url}/create-first-user`}>
                  <CreateFirstUser setInitialized={setInitialized} />
                </CompatRoute>
                <CompatRoute>
                  <Redirect to={`${match.url}/create-first-user`} />
                </CompatRoute>
              </Switch>
            );
          }

          if (initialized === true) {
            if (typeof user === 'undefined' || (user && typeof canAccessAdmin === 'undefined')) {
              return <Loading />;
            }

            return (
              <Switch>
                {Array.isArray(customRoutes) && customRoutes.map(({ path, Component, strict, exact, sensitive }) => (
                  <CompatRoute
                    key={`${match.url}${path}`}
                    path={`${match.url}${path}`}
                    strict={strict}
                    exact={exact}
                    sensitive={sensitive}
                  >
                    <Component
                      user={user}
                      canAccessAdmin={canAccessAdmin}
                    />
                  </CompatRoute>
                ))}

                <CompatRoute path={`${match.url}/login`}>
                  <Login />
                </CompatRoute>
                <CompatRoute path={`${match.url}${logoutRoute}`}>
                  <Logout />
                </CompatRoute>
                <CompatRoute path={`${match.url}${logoutInactivityRoute}`}>
                  <Logout inactivity />
                </CompatRoute>

                {!userCollection.auth.disableLocalStrategy && (
                  <CompatRoute path={`${match.url}/forgot`}>
                    <ForgotPassword />
                  </CompatRoute>
                )}

                {!userCollection.auth.disableLocalStrategy && (
                  <CompatRoute path={`${match.url}/reset/:token`}>
                    <ResetPassword />
                  </CompatRoute>
                )}

                {collections.map((collection) => {
                  if (collection?.auth?.verify && !collection.auth.disableLocalStrategy) {
                    return (
                      <CompatRoute
                        key={`${collection.slug}-verify`}
                        path={`${match.url}/${collection.slug}/verify/:token`}
                        exact
                      >
                        <Verify collection={collection} />
                      </CompatRoute>
                    );
                  }
                  return null;
                })}

                <Route
                  render={() => {
                    if (user) {
                      if (canAccessAdmin) {
                        return (
                          <DefaultTemplate>
                            <Switch>
                              <CompatRoute
                                path={`${match.url}/`}
                                exact
                              >
                                <Dashboard />
                              </CompatRoute>

                              <CompatRoute path={`${match.url}/account`}>
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
                                    path={`${match.url}/collections/${collection.slug}`}
                                    exact
                                    render={(routeProps) => {
                                      if (permissions?.collections?.[collection.slug]?.read?.permission) {
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
                                    path={`${match.url}/collections/${collection.slug}/create`}
                                    exact
                                    render={(routeProps) => {
                                      if (permissions?.collections?.[collection.slug]?.create?.permission) {
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
                                    path={`${match.url}/collections/${collection.slug}/:id`}
                                    exact
                                    render={(routeProps) => {
                                      const { match: { params: { id } } } = routeProps;
                                      if (permissions?.collections?.[collection.slug]?.read?.permission) {
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
                                      path={`${match.url}/collections/${collection.slug}/:id/versions`}
                                      exact
                                      render={(routeProps) => {
                                        if (permissions?.collections?.[collection.slug]?.readVersions?.permission) {
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
                                      path={`${match.url}/collections/${collection.slug}/:id/versions/:versionID`}
                                      exact
                                      render={(routeProps) => {
                                        if (permissions?.collections?.[collection.slug]?.readVersions?.permission) {
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

                              {globals && globals.reduce((globalRoutes, global) => {
                                const routesToReturn = [
                                  ...globalRoutes,
                                  <CompatRoute
                                    key={`${global.slug}`}
                                    path={`${match.url}/globals/${global.slug}`}
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
                                      path={`${match.url}/globals/${global.slug}/versions`}
                                      exact
                                      render={(routeProps) => {
                                        if (permissions?.globals?.[global.slug]?.readVersions?.permission) {
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
                                      path={`${match.url}/globals/${global.slug}/versions/:versionID`}
                                      exact
                                      render={(routeProps) => {
                                        if (permissions?.globals?.[global.slug]?.readVersions?.permission) {
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

                              <CompatRoute path={`${match.url}*`}>
                                <NotFound />
                              </CompatRoute>
                            </Switch>
                          </DefaultTemplate>
                        );
                      }

                      if (canAccessAdmin === false) {
                        return <Unauthorized />;
                      }

                      return <Loading />;
                    }

                    return <Redirect to={`${match.url}/login`} />;
                  }}
                />
                <CompatRoute path={`${match.url}*`}>
                  <NotFound />
                </CompatRoute>
              </Switch>
            );
          }

          return null;
        }}
      />
      <StayLoggedIn refreshCookie={refreshCookie} />
    </Suspense>
  );
};

export default withRouter(Routes);
