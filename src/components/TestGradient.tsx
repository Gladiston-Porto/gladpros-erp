'use client'

export function TestGradient() {
  const gradients = {
    neutral: 'linear-gradient(135deg, rgba(0, 152, 218, 0.8) 0%, rgb(0, 152, 218) 100%)',
    income: 'linear-gradient(135deg, rgb(74, 222, 128) 0%, rgb(22, 163, 74) 100%)',
    error: 'linear-gradient(135deg, rgba(255, 140, 0, 0.8) 0%, rgb(255, 140, 0) 100%)',
    expense: 'linear-gradient(135deg, rgb(248, 113, 113) 0%, rgb(220, 38, 38) 100%)',
  }

  return (
    <div style={{ 
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      border: '2px solid #e5e7eb',
      marginBottom: '24px'
    }}>
      <h2 style={{ 
        fontFamily: 'Neuropol, sans-serif',
        fontSize: '24px',
        marginBottom: '16px',
        color: '#111827'
      }}>
        🧪 TESTE DE GRADIENTES
      </h2>
      
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {Object.entries(gradients).map(([name, gradient]) => (
          <div key={name} style={{ textAlign: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '12px',
              background: gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '32px',
              marginBottom: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              ✓
            </div>
            <div style={{ 
              fontSize: '12px',
              fontWeight: 600,
              color: '#6b7280'
            }}>
              {name}
            </div>
          </div>
        ))}
      </div>

      <p style={{ 
        marginTop: '16px',
        fontSize: '14px',
        color: '#ef4444',
        fontWeight: 600
      }}>
        ⚠️ Se você NÃO vê 4 caixas coloridas com gradientes acima, há um problema!
      </p>
      
      <p style={{ 
        marginTop: '8px',
        fontSize: '14px',
        color: '#6b7280'
      }}>
        Esperado: Azul (neutral), Verde (income), Laranja (error), Vermelho (expense)
      </p>
    </div>
  )
}
