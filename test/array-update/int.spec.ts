import mongoose from 'mongoose';
import { initPayloadTest } from '../helpers/configHelpers';
import payload from '../../src';
import config from './config';
import type { Array as ArrayCollection } from './payload-types';

const collection = config.collections[0]?.slug;

describe('array-update', () => {
  beforeAll(async () => {
    await initPayloadTest({ __dirname });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await payload.mongoMemoryServer.stop();
  });

  it('should persist existing array-based data while updating and passing row ID', async () => {
    const originalText = 'some optional text';

    const doc = await payload.create({
      collection,
      data: {
        array: [
          {
            required: 'a required field here',
            optional: originalText,
          },
          {
            required: 'another required field here',
            optional: 'this is cool',
          },
        ],
      },
    });

    const arrayWithExistingValues = [...doc.array];

    const updatedText = 'this is some new text for the first item in array';

    arrayWithExistingValues[0] = {
      id: arrayWithExistingValues[0].id,
      required: updatedText,
    };

    const updatedDoc = await payload.update<ArrayCollection>({
      id: doc.id,
      collection,
      data: {
        array: arrayWithExistingValues,
      },
    });

    expect(updatedDoc.array?.[0]).toMatchObject({
      required: updatedText,
      optional: originalText,
    });
  });

  it('should disregard existing array-based data while updating and NOT passing row ID', async () => {
    const updatedText = 'here is some new text';

    const secondArrayItem = {
      required: 'test',
      optional: 'optional test',
    };

    const doc = await payload.create<ArrayCollection>({
      collection,
      data: {
        array: [
          {
            required: 'a required field here',
            optional: 'some optional text',
          },
          secondArrayItem,
        ],
      },
    });

    const updatedDoc = await payload.update<ArrayCollection>({
      id: doc.id,
      collection,
      data: {
        array: [
          {
            required: updatedText,
          },
          {
            id: doc.array?.[1].id,
            required: doc.array?.[1].required as string,
            // NOTE - not passing optional field. It should persist
            // because we're passing ID
          },
        ],
      },
    });

    expect(updatedDoc.array?.[0].required).toStrictEqual(updatedText);
    expect(updatedDoc.array?.[0].optional).toBeUndefined();

    expect(updatedDoc.array?.[1]).toMatchObject(secondArrayItem);
  });
  describe('locale', () => {
    it('should should sort array items based on id', async () => {
      const en = {
        firstArrayItem: {
          required: 'a required field here',
          optional: 'some optional text',
        },
        secondArrayItem: {
          required: 'test',
          optional: 'optional test',
        },
      };
      const de = {
        firstArrayItem: {
          required: 'hier ein Pflichtfeld',
          optional: 'ein optionaler text',
        },
        secondArrayItem: {
          required: 'test de',
          optional: 'optionaler test',
        },
      };

      const doc = await payload.create<ArrayCollection>({
        locale: 'en',
        collection,
        data: {
          array: [
            en.firstArrayItem,
            en.secondArrayItem,
          ],
        },
      });

      await payload.update<ArrayCollection>({
        id: doc.id,
        locale: 'de',
        collection,
        data: {
          array: [
            { id: doc.array?.[0].id, ...de.firstArrayItem },
            { id: doc.array?.[1].id, ...de.secondArrayItem },
          ],
        },
      });
      await payload.update<ArrayCollection>({
        id: doc.id,
        locale: 'en',
        collection,
        data: {
          array: [
            // swap order
            { id: doc.array?.[1].id, ...en.secondArrayItem },
            { id: doc.array?.[0].id, ...en.firstArrayItem },
          ],
        },
      });

      const enDoc = await payload.findByID<ArrayCollection>({
        id: doc.id,
        locale: 'en',
        collection,
      });

      expect(enDoc.array?.[0].id).toStrictEqual(doc.array?.[1].id);
      expect(enDoc.array?.[1].id).toStrictEqual(doc.array?.[0].id);
      expect(enDoc.array?.[0]).toMatchObject(en.secondArrayItem);
      expect(enDoc.array?.[1]).toMatchObject(en.firstArrayItem);


      const deDoc = await payload.findByID<ArrayCollection>({
        id: doc.id,
        locale: 'de',
        collection,
      });

      expect(deDoc.array?.[0].id).toStrictEqual(doc.array?.[1].id);
      expect(deDoc.array?.[1].id).toStrictEqual(doc.array?.[0].id);
      expect(deDoc.array?.[0]).toMatchObject(de.secondArrayItem);
      expect(deDoc.array?.[1]).toMatchObject(de.firstArrayItem);
    });
    it('should should delete array items based on id', async () => {
      const en = {
        firstArrayItem: {
          required: 'a required field here',
          optional: 'some optional text',
        },
        secondArrayItem: {
          required: 'test',
          optional: 'optional test',
        },
        thirdArrayItem: {
          required: 'test 3',
          optional: 'optional test 3',
        },
      };
      const de = {
        firstArrayItem: {
          required: 'hier ein Pflichtfeld',
          optional: 'ein optionaler text',
        },
        secondArrayItem: {
          required: 'test de',
          optional: 'optionaler test',
        },
        thirdArrayItem: {
          required: 'test de 3',
          optional: 'optionaler test 3',
        },
      };

      const doc = await payload.create<ArrayCollection>({
        locale: 'en',
        collection,
        data: {
          array: [
            en.firstArrayItem,
            en.secondArrayItem,
            en.thirdArrayItem,
          ],
        },
      });

      await payload.update<ArrayCollection>({
        id: doc.id,
        locale: 'de',
        collection,
        data: {
          array: [
            { id: doc.array?.[0].id, ...de.firstArrayItem },
            { id: doc.array?.[1].id, ...de.secondArrayItem },
            { id: doc.array?.[2].id, ...de.thirdArrayItem },
          ],
        },
      });
      await payload.update<ArrayCollection>({
        id: doc.id,
        locale: 'en',
        collection,
        data: {
          array: [
            // delete second item
            { id: doc.array?.[0].id, ...en.firstArrayItem },
            { id: doc.array?.[2].id, ...en.thirdArrayItem },
          ],
        },
      });

      const enDoc = await payload.findByID<ArrayCollection>({
        id: doc.id,
        locale: 'en',
        collection,
      });

      expect(enDoc.array?.[0].id).toStrictEqual(doc.array?.[0].id);
      expect(enDoc.array?.[1].id).toStrictEqual(doc.array?.[2].id);
      expect(enDoc.array?.[0]).toMatchObject(en.firstArrayItem);
      expect(enDoc.array?.[1]).toMatchObject(en.thirdArrayItem);


      const deDoc = await payload.findByID<ArrayCollection>({
        id: doc.id,
        locale: 'de',
        collection,
      });

      expect(deDoc.array?.[0].id).toStrictEqual(doc.array?.[0].id);
      expect(deDoc.array?.[1].id).toStrictEqual(doc.array?.[2].id);
      expect(deDoc.array?.[0]).toMatchObject(de.firstArrayItem);
      expect(deDoc.array?.[1]).toMatchObject(de.thirdArrayItem);
    });
  });
});
