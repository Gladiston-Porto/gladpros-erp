const fs = require('fs');
const path = require('path');

const files = [
    "packages/financeiro/src/api/despesas/[id]/aprovar/route.ts",
    "packages/financeiro/src/api/despesas/[id]/pagar/route.ts",
    "packages/financeiro/src/api/despesas/[id]/rejeitar/route.ts",
    "packages/financeiro/src/api/despesas/[id]/route.ts",
    "packages/financeiro/src/api/despesas/categorias/route.ts",
    "packages/financeiro/src/api/despesas/route.ts"
];

const basePath = "c:\\Users\\gladi\\Documents\\gladpros-nextjs";

files.forEach(fileRel => {
    const filePath = path.join(basePath, fileRel);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const newContent = content.replace(/error\.errors/g, "error.issues");
        
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Updated ${fileRel}`);
        } else {
            console.log(`No changes in ${fileRel}`);
        }
    } catch (e) {
        console.error(`Error processing ${fileRel}: ${e.message}`);
    }
});
