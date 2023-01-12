import { buildConfig } from '../buildConfig';

export default buildConfig({
  localization: {
    defaultLocale: 'en',
    locales: ['en', 'de'],
  },
  collections: [
    {
      slug: 'arrays',
      fields: [
        {
          name: 'array',
          type: 'array',
          fields: [
            {
              type: 'text',
              name: 'required',
              required: true,
              localized: true,
            },
            {
              type: 'text',
              name: 'optional',
              localized: true,
            },
          ],
        },
      ],
    },
  ],
});
