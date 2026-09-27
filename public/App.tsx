import React, { useState, useEffect } from 'react';
import { User, Sale } from './types';
import { db } from './services/db';
import { sunAI, ParsedTransaction } from './services/sunAI';
import { Header } from './components/Header';
import { BottomNav, MainTab } from './components/BottomNav';
import { ConfirmationModal } from './components/ConfirmationModal';
import { OwnerAlterationModal } from './components/OwnerAlterationModal';
import { StaffEditBlockModal } from './components/StaffEditBlockModal';
import { DocumentScannerModal } from './components/DocumentScannerModal';
import { UserSwitcherModal } from './components/UserSwitcherModal';
import { DriveModal } from './components/DriveModal';
import { HomeScreen } from './screens/HomeScreen';
import { SalesScreen } from './screens/SalesScreen';
import { StockScreen } from './screens/StockScreen';
import { AuditScreen } from './screens/AuditScreen';
import { MoreScreen } from './screens/MoreScreen';

export const App: React.FC = () => {
  const users = db.getUsers();
  const [currentUser, setCurrentUser] = useState<User>(users[0] || {
    id: 'USR-01',
    name: 'Anand',
    role: 'OWNER',
    email: 'sunsystems.sec@gmail.com',
    pin: '1234',
    isActive: true
  });

  const [activeTab, setActiveTab] = useState<MainTab>('HOME');
  const [, setDbVersion] = useState(0);

  const [pendingTransaction, setPendingTransaction] = useState<ParsedTransaction | null>(null);
  const [ownerAlteration, setOwnerAlteration] = useState<{ module: 'SALES' | 'STOCK' | 'PURCHASES' | 'EXPENSES' | 'CREDIT'; record: any } | null>(null);
  const [showStaffBlockModal, setShowStaffBlockModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [showUserSwitchModal, setShowUserSwitchModal] = useState(false);

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setDbVersion(v => v + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  const handleCommandSubmit = (text: string) => {
    const parsed = sunAI.parseCommand(text, currentUser);

    if (parsed.intent === 'QUERY') {
      if (parsed.queryType === 'SALES') setActiveTab('SALES');
      else if (parsed.queryType === 'STOCK') setActiveTab('STOCK');
      else if (parsed.queryType === 'AUDIT') setActiveTab('AUDIT');
      else if (parsed.queryType === 'CASH') setActiveTab('MORE');
      else setActiveTab('SALES');
      sunAI.speak(parsed.summary);
      return;
    }

    if (parsed.intent === 'DAILY_CLOSING') {
      setActiveTab('MORE');
      sunAI.speak('Opening Daily Closing and Cash Reconciliation for today.');
      return;
    }

    if (parsed.intent === 'UNKNOWN') {
      alert("SUN AI: Could not determine action. Please try e.g. 'Sold Dell 5420 to Ramesh for 26500 UPI' or 'Add HP 840 G7 to stock'.");
      return;
    }

    setPendingTransaction(parsed);
    sunAI.speak(`Please confirm ${parsed.intent.toLowerCase()}`);
  };

  const handleQuickAction = (action: 'SALE' | 'STOCK' | 'PURCHASE' | 'EXPENSE') => {
    if (action === 'SALE') {
      handleCommandSubmit('Sold Dell Latitude 5420 to Ramesh for 26500 UPI');
    } else if (action === 'STOCK') {
      handleCommandSubmit('Add Dell Latitude 5420 serial ABC123 cost 22000 A grade');
    } else if (action === 'PURCHASE') {
      handleCommandSubmit('Purchased five Dell Latitude 5420 from ABC Computers for 110000');
    } else if (action === 'EXPENSE') {
      handleCommandSubmit('Paid 2500 cash for courier');
    }
  };

  const handleEditAttempt = (module: 'SALES' | 'STOCK' | 'PURCHASES' | 'EXPENSES' | 'CREDIT', record: any) => {
    const check = db.checkCanAlter(currentUser);
    if (check.allowed) {
      setOwnerAlteration({ module, record });
    } else {
      setShowStaffBlockModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-slate-950 border-x border-slate-800 relative flex flex-col shadow-2xl">
        <Header
          currentUser={currentUser}
          onOpenUserSwitch={() => setShowUserSwitchModal(true)}
          onOpenDriveModal={() => setShowDriveModal(true)}
        />

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'HOME' && (
            <HomeScreen
              currentUser={currentUser}
              onCommandSubmit={handleCommandSubmit}
              onOpenScan={() => setShowScanModal(true)}
              onQuickAction={handleQuickAction}
              onSelectSale={(sale: Sale) => handleEditAttempt('SALES', sale)}
              onNavigateTab={(t: MainTab) => setActiveTab(t)}
            />
          )}

          {activeTab === 'SALES' && (
            <SalesScreen
              currentUser={currentUser}
              onNewSaleClick={() => handleQuickAction('SALE')}
              onEditSale={(sale: Sale) => handleEditAttempt('SALES', sale)}
            />
          )}

          {activeTab === 'STOCK' && (
            <StockScreen
              currentUser={currentUser}
              onNewStockClick={() => handleQuickAction('STOCK')}
              onOpenScan={() => setShowScanModal(true)}
              onEditStock={(item) => handleEditAttempt('STOCK', item)}
            />
          )}

          {activeTab === 'AUDIT' && (
            <AuditScreen
              currentUser={currentUser}
              onVoiceAuditQuery={(q: string) => handleCommandSubmit(q)}
            />
          )}

          {activeTab === 'MORE' && (
            <MoreScreen
              currentUser={currentUser}
              onOpenDriveModal={() => setShowDriveModal(true)}
              onOpenScanModal={() => setShowScanModal(true)}
              onOpenUserSwitch={() => setShowUserSwitchModal(true)}
            />
          )}
        </main>

        <BottomNav
          activeTab={activeTab}
          onSelectTab={(tab: MainTab) => setActiveTab(tab)}
          auditAlertCount={2}
        />

        {pendingTransaction && (
          <ConfirmationModal
            transaction={pendingTransaction}
            currentUser={currentUser}
            onConfirm={() => setPendingTransaction(null)}
            onCancel={() => setPendingTransaction(null)}
          />
        )}

        {ownerAlteration && (
          <OwnerAlterationModal
            module={ownerAlteration.module}
            record={ownerAlteration.record}
            currentUser={currentUser}
            onClose={() => setOwnerAlteration(null)}
            onSaveSuccess={() => setOwnerAlteration(null)}
          />
        )}

        {showStaffBlockModal && (
          <StaffEditBlockModal
            currentUser={currentUser}
            onClose={() => setShowStaffBlockModal(false)}
          />
        )}

        {showScanModal && (
          <DocumentScannerModal
            currentUser={currentUser}
            onClose={() => setShowScanModal(false)}
            onScannedSuccess={() => {
              sunAI.speak('Document scanned and saved to Google Drive.');
            }}
          />
        )}

        {showUserSwitchModal && (
          <UserSwitcherModal
            currentUser={currentUser}
            onSelectUser={(u: User) => setCurrentUser(u)}
            onClose={() => setShowUserSwitchModal(false)}
          />
        )}

        {showDriveModal && (
          <DriveModal
            onClose={() => setShowDriveModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default App;
