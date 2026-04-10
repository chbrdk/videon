import {
  formatSemanticSceneDescription,
  semanticSceneDescriptionSchema,
} from '../src/services/openai.service';

describe('semantic scene structured output', () => {
  it('formats structured fields into stored description text', () => {
    const parsed = semanticSceneDescriptionSchema.parse({
      summary: 'Eine Person geht durch einen Park.',
      subjects: ['Person', 'Bäume'],
      actions: ['gehen'],
      setting: 'Stadtpark am Nachmittag',
      mood: 'ruhig',
      notable_details: ['Sonnenlicht'],
    });

    const text = formatSemanticSceneDescription(parsed);
    expect(text).toContain('Eine Person geht durch einen Park.');
    expect(text).toContain('Subjekte:');
    expect(text).toContain('Person');
  });
});
