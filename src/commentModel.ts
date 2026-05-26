export interface CollectedComment {
    uri: string;
    filePath: string;
    line: number;
    character: number;
    text: string;
    primaryTag: string;
    extraTags: string[];
    priority?: string;
    completed: boolean;
    author?: string;
    date?: string;
}

export interface TemplateVariables {
    date: string;
    time: string;
    author: string;
    year: string;
}

export function extractMetadataTags(text: string): { primaryTag: string; extraTags: string[]; priority?: string; completed: boolean } {
    const body = stripCommentDelimiter(text).trim();
    const primaryMatch = body.match(/^([A-Za-z0-9_?!*+\-/]+)/);
    const primaryTag = primaryMatch ? primaryMatch[1] : '';
    const extraTags: string[] = [];
    const extraTagPattern = /\[([^\]]+)\]|\(([^)]+)\)/g;
    let match = extraTagPattern.exec(text);

    while (match !== null) {
        extraTags.push(match[1] !== undefined ? match[1] : match[2]);
        match = extraTagPattern.exec(text);
    }

    const priority = extraTags.slice().reverse().find((tag) => /^(?:HIGH|MEDIUM|LOW|URGENT|P[0-3])$/i.test(tag));
    const completed = /^DONE$/i.test(primaryTag) || /(?:\[|\()(?:done|complete)(?:\]|\))/i.test(text);

    return {
        primaryTag,
        extraTags,
        priority,
        completed
    };
}

export function replaceTemplateVariables(template: string, variables: TemplateVariables): string {
    return template.replace(/\$\{(date|time|author|year)\}/g, (_match, key: keyof TemplateVariables) => variables[key]);
}

export function buildTagDistribution(comments: CollectedComment[]): { [tag: string]: number } {
    return comments.reduce((distribution: { [tag: string]: number }, comment) => {
        distribution[comment.primaryTag] = (distribution[comment.primaryTag] || 0) + 1;
        return distribution;
    }, {});
}

export function commentsToCsv(comments: CollectedComment[]): string {
    const header = 'file,line,character,primaryTag,extraTags,priority,completed,text';
    const rows = comments.map((comment) => [
        quoteCsvValue(comment.filePath),
        comment.line.toString(),
        comment.character.toString(),
        quoteCsvValue(comment.primaryTag),
        quoteCsvValue(comment.extraTags.join(';')),
        quoteCsvValue(comment.priority || ''),
        comment.completed.toString(),
        quoteCsvValue(comment.text)
    ].join(','));

    return [header].concat(rows).join('\n');
}

export function commentsToJson(comments: CollectedComment[]): string {
    return JSON.stringify(comments, null, 2);
}

function quoteCsvValue(value: string): string {
    return '"' + value.replace(/"/g, '""') + '"';
}

function stripCommentDelimiter(text: string): string {
    const trimmed = text.trimLeft();
    const delimiters = ['<!--', '//', '/*', '--', '#', ';', '*'];
    const delimiter = delimiters.find((value) => trimmed.indexOf(value) === 0);

    return delimiter ? trimmed.slice(delimiter.length) : trimmed;
}
