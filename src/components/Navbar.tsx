
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation('common');

  const navItems = [
    { path: '/', icon: '🏠', label: t('nav.home'), activeIcon: '🏠' },
    { path: '/dashboard', icon: '📊', label: '看板', activeIcon: '📊' },
    { path: '/history', icon: '🕐', label: t('nav.history'), activeIcon: '📜' },
    { path: '/students', icon: '�', label: '学生', activeIcon: '👥' },
    { path: '/faq', icon: '❓', label: '帮助', activeIcon: '📚' },
    { path: '/profile', icon: '👤', label: t('nav.profile'), activeIcon: '✨' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-lg mx-auto px-2 pt-2 pb-[env(safe-area-inset-bottom,8px)]">
          <div className="flex justify-around items-center">
            {navItems.map((item) => {
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'relative flex flex-col items-center py-1 px-4 rounded-lg transition-all duration-200',
                    active && 'bg-blue-50',
                  )}
                >
                  <div className="relative z-10">
                    <span
                      className={clsx(
                        'text-xl block text-center leading-none',
                        !active && 'opacity-60',
                      )}
                    >
                      {active ? item.activeIcon : item.icon}
                    </span>
                  </div>

                  <span
                    className={clsx(
                      'text-xs mt-1 relative z-10 transition-colors duration-200',
                      active ? 'text-blue-600 font-medium' : 'text-slate-500',
                    )}
                  >
                    {item.label}
                  </span>

                  {active && (
                    <div className="absolute -bottom-1 w-1 h-1 bg-blue-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
