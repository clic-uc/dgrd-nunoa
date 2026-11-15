# Administración de usuarios

Solo administradores, en `/administracion/usuarios` y `/api/users`. Listado con búsqueda, alta institucional, edición de nombre/correo, rol usuario/administrador, activación y restablecimiento de contraseña (12–128 caracteres). La contraseña usa el hasher scrypt de Better Auth y nunca se devuelve ni se incluye en logs. El cambio de correo, rol, activación o contraseña revoca sesiones.

No se puede cambiar el propio rol, desactivar ni borrar la propia cuenta. Una cuenta con historial se desactiva, no se elimina. Al menos un administrador permanece activo; las mutaciones se serializan y revalidan el rol del ejecutor dentro de la transacción. Los endpoints administrativos alternativos de Better Auth se bloquean en el handler HTTP para que no permitan eludir estas reglas. Login, sesión, cierre de sesión y cambios personales de contraseña mantienen sus endpoints habituales.

Los usuarios sin historial pueden eliminarse con confirmación. Sus cuentas de acceso y sesiones se eliminan por las FK existentes; los datos de dominio están protegidos por RESTRICT. Correo verificado no se presume al crear una cuenta administrada.
