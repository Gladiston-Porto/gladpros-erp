const { z } = require('zod');

// Regex patterns (Strict Production Match)
const telefoneRegex = /^(?:\+?\d[\d\s\-\(\)]{9,14})$/;
const zipCodeRegex = /^\d{5}(-\d{4})?$/; // Strict US ZIP
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Utils
const nullIfBlank = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t.length ? t : null;
};

// Schema definition (Strict Production Match)
const clienteCreateSchema = z.object({
    tipo: z.enum(['PF', 'PJ']),

    // Condicionais baseados no tipo
    nomeCompleto: z.string().trim().min(1).max(255).optional().nullable(),
    razaoSocial: z.string().trim().max(255).optional().nullable(),
    nomeFantasia: z.string().trim().max(255).optional().nullable(),

    // Campos obrigatórios
    email: z.string().trim().min(1).regex(emailRegex).max(255).transform(v => v.toLowerCase()),
    telefone: z.custom((v) => /^\d{10}$/.test(String(v).replace(/\D/g, ''))),

    // Endereço (US Standard) - Strict Validation
    addressStreet: z.string().trim().min(1).max(255),
    addressUnit: z.preprocess(nullIfBlank, z.string().max(50).nullable().optional()),
    addressCity: z.string().trim().min(1).max(100),
    addressState: z.string().trim().length(2).transform(v => v.toUpperCase()),
    addressZip: z.string().trim().min(1).regex(zipCodeRegex).max(20),
    addressCounty: z.preprocess(nullIfBlank, z.string().max(100).nullable().optional()),

    // Etc...
    // Etc...
}).superRefine((data, ctx) => {
    if (data.tipo === 'PF') {
        if (!data.nomeCompleto || data.nomeCompleto.trim().length === 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nome obrigatório', path: ['nomeCompleto'] });
        }
    }
    if (data.tipo === 'PJ') {
        if (!data.nomeFantasia || data.nomeFantasia.trim().length === 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nome Fantasia obrigatório', path: ['nomeFantasia'] });
        }
    }
});

// Test Cases
const tests = [
    {
        name: 'Invalid: Missing Address',
        data: {
            tipo: 'PF', nomeCompleto: 'Test', email: 'test@test.com', telefone: '4693346918'
        },
        expectValid: false,
        expectedErrors: ['addressStreet', 'addressCity', 'addressState', 'addressZip']
    },
    {
        name: 'Invalid: Empty Address Strings',
        data: {
            tipo: 'PF', nomeCompleto: 'Test', email: 'test@test.com', telefone: '4693346918',
            addressStreet: '', addressCity: '', addressState: 'TX', addressZip: ''
        },
        expectValid: false,
        expectedErrors: ['addressStreet', 'addressCity', 'addressZip']
    },
    {
        name: 'Invalid: Only Spaces (Trim Check)',
        data: {
            tipo: 'PF', nomeCompleto: '   ', email: '  ', telefone: '4693346918',
            addressStreet: '   ', addressCity: '   ', addressState: 'TX', addressZip: '75001'
        },
        expectValid: false,
        expectedErrors: ['nomeCompleto', 'email', 'addressStreet', 'addressCity']
    },
    {
        name: 'Invalid: PJ Missing Nome Fantasia',
        data: {
            tipo: 'PJ', razaoSocial: 'Corp Inc', email: 'corp@test.com', telefone: '4693346918',
            addressStreet: '123 St', addressCity: 'Dallas', addressState: 'TX', addressZip: '75001'
        },
        expectValid: false,
        expectedErrors: ['nomeFantasia']
    },
    {
        name: 'Valid: Full Address',
        data: {
            tipo: 'PF', nomeCompleto: 'Test', email: 'test@test.com', telefone: '4693346918',
            addressStreet: '123 Main St', addressCity: 'Dallas', addressState: 'tx', addressZip: '75001'
        },
        expectValid: true,
        transformCheck: (data) => data.addressState === 'TX'
    }
];

console.log('--- Running Validation Logic Tests ---\n');
let passed = 0;
let failed = 0;

tests.forEach(test => {
    const result = clienteCreateSchema.safeParse(test.data);
    const isValid = result.success;

    if (isValid === test.expectValid) {
        if (isValid && test.transformCheck && !test.transformCheck(result.data)) {
            console.log(`[FAIL] ${test.name} - Transform check failed`);
            failed++;
            return;
        }

        // Check specific errors if expected
        if (!isValid && test.expectedErrors) {
            const fieldErrors = result.error.flatten().fieldErrors;
            const missing = test.expectedErrors.filter(e => !fieldErrors[e]);
            if (missing.length > 0) {
                console.log(`[FAIL] ${test.name} - Missing expected errors for: ${missing.join(', ')}`);
                console.log('Got errors:', JSON.stringify(fieldErrors));
                failed++;
                return;
            }
        }

        console.log(`[PASS] ${test.name}`);
        passed++;
    } else {
        console.log(`[FAIL] ${test.name} - Expected ${test.expectValid} but got ${isValid}`);
        if (!isValid) console.log('Errors:', JSON.stringify(result.error.flatten().fieldErrors, null, 2));
        failed++;
    }
});

console.log(`\nSummary: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
