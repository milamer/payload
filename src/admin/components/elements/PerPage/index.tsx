import React from 'react';
import qs from 'qs';
import { useNavigate } from 'react-router-dom-v5-compat';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from '../../utilities/SearchParams';
import Popup from '../Popup';
import Chevron from '../../icons/Chevron';
import { defaults } from '../../../../collections/config/defaults';

import './index.scss';

const baseClass = 'per-page';

const defaultLimits = defaults.admin.pagination.limits;

export type Props = {
  limits: number[]
  limit: number
  handleChange?: (limit: number) => void
  modifySearchParams?: boolean
}

const PerPage: React.FC<Props> = ({ limits = defaultLimits, limit, handleChange, modifySearchParams = true }) => {
  const params = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation('general');

  return (
    <div className={baseClass}>
      <Popup
        horizontalAlign="right"
        button={(
          <strong>
            {t('perPage', { limit })}
            <Chevron />
          </strong>
        )}
        render={({ close }) => (
          <div>
            <ul>
              {limits.map((limitNumber, i) => (
                <li
                  className={`${baseClass}-item`}
                  key={i}
                >
                  <button
                    type="button"
                    className={[
                      `${baseClass}__button`,
                      limitNumber === Number(limit) && `${baseClass}__button-active`,
                    ].filter(Boolean).join(' ')}
                    onClick={() => {
                      close();
                      if (handleChange) handleChange(limitNumber);
                      if (modifySearchParams) {
                        navigate({
                          search: qs.stringify({
                            ...params,
                            limit: limitNumber,
                          }, { addQueryPrefix: true }),
                        }, { replace: true });
                      }
                    }}
                  >
                    {limitNumber === Number(limit) && (
                      <Chevron />
                    )}
                    {limitNumber}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      />
    </div>
  );
};

export default PerPage;
