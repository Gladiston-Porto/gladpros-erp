#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repos = [
    'Gladiston-Porto-gladpros-ui',
    'Gladiston-Porto-gladpros-auth', 
    'Gladiston-Porto-gladpros-proposals',
    'Gladiston-Porto-gladpros-clients',
    'Gladiston-Porto-gladpros-dashboard'
];

async function checkWorkflowStatus(repo) {
    console.log(`\n🔍 Verificando workflows do repositório: ${repo}`);
    console.log('='.repeat(60));
    
    try {
        // Verificar se há workflow failures recentes
        const command = `gh api repos/Gladiston-Porto/${repo}/actions/runs --per-page 10`;
        const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        const data = JSON.parse(result);
        
        if (data.workflow_runs && data.workflow_runs.length > 0) {
            console.log(`📊 Últimas execuções de workflow:`);
            
            data.workflow_runs.slice(0, 5).forEach((run, index) => {
                const status = run.conclusion === 'success' ? '✅' : 
                              run.conclusion === 'failure' ? '❌' : 
                              run.conclusion === 'cancelled' ? '🔄' : '⏳';
                              
                console.log(`   ${status} ${run.name} - ${run.head_branch} (${run.conclusion || 'running'})`);
                console.log(`      💬 "${run.head_commit.message.split('\n')[0]}"`);
                console.log(`      🕐 ${new Date(run.created_at).toLocaleString()}`);
                console.log(`      🔗 ${run.html_url}`);
                console.log('');
            });
            
            // Calcular estatísticas
            const totalRuns = Math.min(10, data.workflow_runs.length);
            const successCount = data.workflow_runs.slice(0, 10).filter(run => run.conclusion === 'success').length;
            const failureCount = data.workflow_runs.slice(0, 10).filter(run => run.conclusion === 'failure').length;
            const successRate = ((successCount / totalRuns) * 100).toFixed(1);
            
            console.log(`📈 Estatísticas (últimas ${totalRuns} execuções):`);
            console.log(`   ✅ Sucessos: ${successCount}`);
            console.log(`   ❌ Falhas: ${failureCount}`);
            console.log(`   📊 Taxa de sucesso: ${successRate}%`);
            
            if (successRate < 80) {
                console.log(`\n🚨 ATENÇÃO: Taxa de sucesso baixa (${successRate}%)`);
            }
        } else {
            console.log('ℹ️  Nenhuma execução de workflow encontrada');
        }
        
    } catch (error) {
        if (error.message.includes('Not Found')) {
            console.log('❌ Repositório não encontrado ou sem acesso');
        } else {
            console.log(`❌ Erro ao verificar workflows: ${error.message}`);
        }
    }
}

async function main() {
    console.log('🚀 Verificador de Status dos Workflows dos Módulos GladPros');
    console.log('='.repeat(80));
    
    // Verificar se gh CLI está disponível
    try {
        execSync('gh --version', { stdio: 'ignore' });
    } catch (error) {
        console.log('❌ GitHub CLI (gh) não está instalado ou configurado');
        console.log('📋 Para instalar: winget install GitHub.cli');
        console.log('📋 Para configurar: gh auth login');
        process.exit(1);
    }
    
    for (const repo of repos) {
        await checkWorkflowStatus(repo);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }
    
    console.log('\n✅ Verificação concluída!');
}

main().catch(console.error);