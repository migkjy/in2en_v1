import React, { lazy } from 'react';
import { Route, Switch } from 'react-router-dom';


// ... other imports ...

function App() {
  return (
    <div className="App">
      <Switch>
        {/* ... other routes ... */}
        <Route path="/assignments/new" component={lazy(() => import('./pages/assignments/create'))} />
        <Route path="/assignments/create" component={lazy(() => import('./pages/assignments/create'))} />
        {/* ... other routes ... */}
      </Switch>
    </div>
  );
}

export default App;