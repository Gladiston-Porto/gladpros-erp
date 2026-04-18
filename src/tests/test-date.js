// Teste da transformação de data isoladamente - Formato MM/DD/YYYY
const testDateTransform = (input) => {
  console.log('Input:', input);
  
  if (!input) return undefined;
  const s = String(input).trim();
  console.log('String input:', s);
  
  // Accept MM/DD/YYYY format (US standard)
  const mUs = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mUs) {
    const [, mm, dd, yyyy] = mUs;
    const dayNum = parseInt(dd, 10);
    const monthNum = parseInt(mm, 10);
    
    console.log('Parsed:', { mm, dd, yyyy, monthNum, dayNum });
    
    // Validate day and month ranges
    if (monthNum < 1 || monthNum > 12) {
      console.log('Invalid month:', monthNum);
      throw new Error('INVALID_DATE_FORMAT');
    }
    if (dayNum < 1 || dayNum > 31) {
      console.log('Invalid day:', dayNum);
      throw new Error('INVALID_DATE_FORMAT');
    }
    
    const ddPad = dd.padStart(2, "0");
    const mmPad = mm.padStart(2, "0");
    const result = `${yyyy}-${mmPad}-${ddPad}`;
    console.log('Result:', result);
    return result;
  }
  
  console.log('No match for MM/DD/YYYY format');
  throw new Error('INVALID_DATE_FORMAT');
};

// Testar casos
console.log('=== Teste 1: Data válida MM/DD/YYYY ===');
try { testDateTransform('05/18/1979'); } catch (e) { console.log('Error:', e.message); }

console.log('\n=== Teste 2: Data inválida (dia) ===');
try { testDateTransform('05/32/1979'); } catch (e) { console.log('Error:', e.message); }

console.log('\n=== Teste 3: Data inválida (mês) ===');
try { testDateTransform('13/18/1979'); } catch (e) { console.log('Error:', e.message); }

console.log('\n=== Teste 4: Data super inválida ===');
try { testDateTransform('13/32/1979'); } catch (e) { console.log('Error:', e.message); }
