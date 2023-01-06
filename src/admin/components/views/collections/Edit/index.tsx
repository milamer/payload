import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Navigate, useParams } from 'react-router-dom-v5-compat';
import { useTranslation } from 'react-i18next';
import { useConfig } from '../../../utilities/Config';
import { useAuth } from '../../../utilities/Auth';
import usePayloadAPI from '../../../../hooks/usePayloadAPI';

import RenderCustomComponent from '../../../utilities/RenderCustomComponent';
import DefaultEdit from './Default';
import formatFields from './formatFields';
import buildStateFromSchema from '../../../forms/Form/buildStateFromSchema';
import { useLocale } from '../../../utilities/Locale';
import { IndexProps } from './types';
import { useDocumentInfo } from '../../../utilities/DocumentInfo';
import { Fields } from '../../../forms/Form/types';
import { usePreferences } from '../../../utilities/Preferences';
import { EditDepthContext } from '../../../utilities/EditDepth';
import { CollectionPermission } from '../../../../../auth';

const EditView: React.FC<IndexProps> = (props) => {
  const { collection: incomingCollection, isEditing } = props;

  const {
    slug,
    admin: {
      components: {
        views: {
          Edit: CustomEdit,
        } = {},
      } = {},
    } = {},
  } = incomingCollection;

  const [fields] = useState(() => formatFields(incomingCollection, isEditing));
  const [collection] = useState(() => ({ ...incomingCollection, fields }));
  const [redirect, setRedirect] = useState<string>();

  const locale = useLocale();
  const { serverURL, routes: { admin, api } } = useConfig();
  const { id } = useParams<{id: string}>();
  const { state: locationState } = useLocation();
  const navigate = useNavigate();
  const [initialState, setInitialState] = useState<Fields>();
  const [updatedAt, setUpdatedAt] = useState<string>();
  const { user } = useAuth();
  const { getVersions, preferencesKey, getDocPermissions, docPermissions } = useDocumentInfo();
  const { getPreference } = usePreferences();
  const { t } = useTranslation('general');

  const onSave = useCallback(async (json: any) => {
    getVersions();
    getDocPermissions();
    setUpdatedAt(json?.doc?.updatedAt);
    if (!isEditing) {
      setRedirect(`${admin}/collections/${collection.slug}/${json?.doc?.id}`);
    } else {
      const state = await buildStateFromSchema({ fieldSchema: collection.fields, data: json.doc, user, id, operation: 'update', locale, t });
      setInitialState(state);
    }
  }, [admin, collection, isEditing, getVersions, user, id, t, locale, getDocPermissions]);

  const [{ data, isLoading: isLoadingDocument, isError }] = usePayloadAPI(
    (isEditing ? `${serverURL}${api}/${slug}/${id}` : null),
    { initialParams: { 'fallback-locale': 'null', depth: 0, draft: 'true' } },
  );

  const dataToRender = (locationState as Record<string, unknown>)?.data || data;

  useEffect(() => {
    if (isLoadingDocument) {
      return;
    }
    const awaitInitialState = async () => {
      setUpdatedAt(dataToRender?.updatedAt);
      const state = await buildStateFromSchema({ fieldSchema: fields, data: dataToRender, user, operation: isEditing ? 'update' : 'create', id, locale, t });
      await getPreference(preferencesKey);
      setInitialState(state);
    };

    awaitInitialState();
  }, [dataToRender, fields, isEditing, id, user, locale, isLoadingDocument, preferencesKey, getPreference, t]);

  useEffect(() => {
    if (redirect) {
      navigate(redirect);
    }
  }, [navigate, redirect]);

  if (isError) {
    return (
      <Navigate to={`${admin}/not-found`} />
    );
  }

  const apiURL = `${serverURL}${api}/${slug}/${id}${collection.versions.drafts ? '?draft=true' : ''}`;
  const action = `${serverURL}${api}/${slug}${isEditing ? `/${id}` : ''}?locale=${locale}&depth=0&fallback-locale=null`;
  const hasSavePermission = (isEditing && docPermissions?.update?.permission) || (!isEditing && (docPermissions as CollectionPermission)?.create?.permission);

  return (
    <EditDepthContext.Provider value={1}>
      <RenderCustomComponent
        DefaultComponent={DefaultEdit}
        CustomComponent={CustomEdit}
        componentProps={{
          id,
          isLoading: !initialState || !docPermissions,
          data: dataToRender,
          collection,
          permissions: docPermissions,
          isEditing,
          onSave,
          initialState,
          hasSavePermission,
          apiURL,
          action,
          updatedAt: updatedAt || dataToRender?.updatedAt,
        }}
      />
    </EditDepthContext.Provider>
  );
};
export default EditView;
