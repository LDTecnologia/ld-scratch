function sanitizeNumber (value) {
    const parsed = Number(String(value).trim().replace(',', '.'));
    if (!Number.isFinite(parsed)) return '0';
    if (Object.is(parsed, -0)) return '0';
    return String(parsed);
}

function cIdent (name) {
    const cleaned = String(name || '').replace(/[^A-Za-z0-9_]/g, '_').replace(/^_+/, '');
    const suffix = cleaned || 'var';
    return `v_${suffix}`;
}

module.exports = {sanitizeNumber, cIdent};
