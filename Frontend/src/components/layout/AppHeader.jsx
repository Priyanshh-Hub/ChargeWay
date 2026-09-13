import React from 'react';
import Icon from '../ui/Icon';
import Logo from '../ui/Logo';

const AppHeader = ({ user, onLogout, activeView, setActiveView }) => {
  const navItems = {
    User: [
      { id: "main",         label: "Home",      icon: "bolt"      },
      { id: "findstations", label: "Stations",  icon: "stations"  },
      { id: "bookings",     label: "Sessions",  icon: "booking"   },
      { id: "vehicles",     label: "Vehicles",  icon: "car"       },
      { id: "invoices",     label: "Invoices",  icon: "invoices"  },
    ],
    "Station Manager": [
      { id: "main",      label: "Dashboard", icon: "bolt"      },
      { id: "analytics", label: "Analytics", icon: "analytics" },
    ],
    Admin: [
      { id: "main",          label: "Overview",  icon: "bolt"      },
      { id: "analytics",     label: "Analytics", icon: "analytics" },
      { id: "adminStations", label: "Stations",  icon: "stations"  },
      { id: "adminUsers",    label: "Users",     icon: "users"     },
    ],
  };
  const items = navItems[user?.role] || [];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
      style={{ background: "rgba(5,13,26,0.9)", backdropFilter: "blur(20px)" }}>
      <div className="container mx-auto px-6 py-3 flex items-center justify-between max-w-7xl">
        <Logo size="sm" />

        <nav className="hidden md:flex items-center gap-1">
          {items.map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeView === item.id ? "text-cyan-400 bg-cyan-400/10" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
              <Icon name={item.icon} className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-white leading-tight">{user?.name}</p>
            <p className="text-xs text-cyan-400">{user?.role}</p>
          </div>
          <button onClick={onLogout}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all border border-white/10">
            <Icon name="logout" className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
