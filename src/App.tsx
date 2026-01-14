// 원본 파일과 다른 내용이 포함되어있음.
import { Switch, Route } from "wouter";
import Header from "@/components/Header";
import Dashboard from "@/pages/Dashboard";
import Menu1 from "@/pages/Menu1";
import Menu2 from "@/pages/Menu2";
import Admin from "@/pages/Admin";
import RequestForms from "@/pages/settings/RequestForms";
import ApprovalPaths from "@/pages/settings/ApprovalPaths";
import Permissions from "@/pages/settings/Permissions";
import DatabaseEdit from "@/pages/settings/DatabaseEdit";
import FabInfoRules from "@/pages/settings/FabInfoRules";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/menu1" component={Menu1} />
        <Route path="/menu2" component={Menu2} />
        <Route path="/admin" component={Admin} />
        <Route path="/settings/request-forms" component={RequestForms} />
        <Route path="/settings/approval-paths" component={ApprovalPaths} />
        <Route path="/settings/permissions" component={Permissions} />
        <Route path="/settings/database-edit" component={DatabaseEdit} />
        <Route path="/settings/fab-info-rules" component={FabInfoRules} />
        {/* <Route component={NotFound} /> */}
        <Route path="/" component={Dashboard} />
      </Switch>
    </div>
  );
}
