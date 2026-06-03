import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { CategoriesPage } from "../pages/CategoriesPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ReceiptsPage } from "../pages/ReceiptsPage";
import { RecurringPage } from "../pages/RecurringPage";
import { SettingsPage } from "../pages/SettingsPage";
import { TransactionsPage } from "../pages/TransactionsPage";
import {
  createInitialFinanceDataState,
  createManualTransactionAndReload,
  deleteTransactionAndReload,
  loadFinanceData,
  type TransactionActionResult,
  updateTransactionAndReload,
} from "../services/financeDataService";
import { appRoutes, type RouteId } from "./routes";

export function App() {
  const [currentRouteId, setCurrentRouteId] = useState<RouteId>("dashboard");
  const [financeData, setFinanceData] = useState(createInitialFinanceDataState);

  const activeRoute = useMemo(
    () => appRoutes.find((route) => route.id === currentRouteId) ?? appRoutes[0],
    [currentRouteId],
  );

  useEffect(() => {
    let isMounted = true;

    void loadFinanceData().then((nextState) => {
      if (isMounted) {
        setFinanceData(nextState);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function applyTransactionActionResult(result: TransactionActionResult) {
    if (result.ok && result.data) {
      setFinanceData(result.data);
    }

    return result;
  }

  return (
    <AppShell
      activeRoute={activeRoute}
      currentRouteId={currentRouteId}
      onRouteChange={setCurrentRouteId}
    >
      {currentRouteId === "dashboard" && (
        <DashboardPage overview={financeData.overview} />
      )}
      {currentRouteId === "transactions" && (
        <TransactionsPage
          accounts={financeData.snapshot.accounts}
          categories={financeData.snapshot.categories}
          loadStatus={financeData.status}
          onCreate={async (input) =>
            applyTransactionActionResult(
              await createManualTransactionAndReload(input),
            )
          }
          onDelete={async (transactionId) =>
            applyTransactionActionResult(
              await deleteTransactionAndReload(transactionId),
            )
          }
          onUpdate={async (transactionId, input) =>
            applyTransactionActionResult(
              await updateTransactionAndReload(transactionId, input),
            )
          }
          transactions={financeData.snapshot.transactions}
        />
      )}
      {currentRouteId === "receipts" && (
        <ReceiptsPage
          receiptItems={financeData.snapshot.receiptItems}
          receipts={financeData.snapshot.receipts}
        />
      )}
      {currentRouteId === "recurring" && (
        <RecurringPage recurringExpenses={financeData.snapshot.recurringExpenses} />
      )}
      {currentRouteId === "categories" && (
        <CategoriesPage
          categories={financeData.snapshot.categories}
          categorySpend={financeData.overview.categorySpend}
        />
      )}
      {currentRouteId === "settings" && (
        <SettingsPage
          errorMessage={financeData.errorMessage}
          snapshot={financeData.snapshot}
          status={financeData.status}
          storageMode={financeData.storageMode}
        />
      )}
    </AppShell>
  );
}
