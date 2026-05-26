import * as assert from 'assert';
import {
    buildTagDistribution,
    commentsToCsv,
    extractMetadataTags,
    replaceTemplateVariables
} from '../commentModel';

function testExtractMetadataTags(): void {
    const result = extractMetadataTags('// TODO [urgent] Fix bug (HIGH)');
    assert.strictEqual(result.primaryTag, 'TODO');
    assert.deepStrictEqual(result.extraTags, ['urgent', 'HIGH']);
    assert.strictEqual(result.priority, 'HIGH');
}

function testTemplateVariables(): void {
    const rendered = replaceTemplateVariables(
        'TODO ${date} ${time} ${author} ${year}',
        {
            date: '2026-05-26',
            time: '10:30',
            author: 'Higan',
            year: '2026'
        }
    );
    assert.strictEqual(rendered, 'TODO 2026-05-26 10:30 Higan 2026');
}

function testDistributionAndCsv(): void {
    const comments = [
        {
            uri: 'file:///repo/a.ts',
            filePath: 'a.ts',
            line: 2,
            character: 4,
            text: '// TODO [HIGH] one',
            primaryTag: 'TODO',
            extraTags: ['HIGH'],
            priority: 'HIGH',
            completed: false
        },
        {
            uri: 'file:///repo/b.ts',
            filePath: 'b.ts',
            line: 8,
            character: 0,
            text: '// FIXME two',
            primaryTag: 'FIXME',
            extraTags: [],
            completed: false
        }
    ];

    assert.deepStrictEqual(buildTagDistribution(comments), { TODO: 1, FIXME: 1 });
    assert.strictEqual(
        commentsToCsv(comments),
        'file,line,character,primaryTag,extraTags,priority,completed,text\n' +
        '"a.ts",2,4,"TODO","HIGH","HIGH",false,"// TODO [HIGH] one"\n' +
        '"b.ts",8,0,"FIXME","","",false,"// FIXME two"'
    );
}

testExtractMetadataTags();
testTemplateVariables();
testDistributionAndCsv();

console.log('Komment unit tests passed');
