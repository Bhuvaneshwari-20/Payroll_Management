import { useState, useEffect, useCallback } from 'react';
import { checkPasswordSecurity } from '../services/passwordApi';

/**
 * Call once near the root of your authenticated layout (after login).
 * Mirrors the PHP flow: on login, silently check whether the employee's
 * password still equals their employee_code, and if so force them to
 * set a real one before they can use the app.
 */
export default function useForcePasswordChange() {
  const [mustChange, setMustChange] = useState(false);
  const [employeeCode, setEmployeeCode] = useState('');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await checkPasswordSecurity();
        if (cancelled) return;
        if (res.data.status === 'warning' && res.data.same_password) {
          setMustChange(true);
          setEmployeeCode(res.data.employee_code || '');
        }
      } catch {
        // fail open — don't block login on a network hiccup
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const clear = useCallback(() => setMustChange(false), []);

  return { mustChange, employeeCode, checked, clear };
}