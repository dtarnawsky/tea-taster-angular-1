import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from '@app/core';
import { TeaDetailsPage } from './tea-details.page';

const routes: Routes = [
  {
    path: ':id',
    component: TeaDetailsPage,
    canActivate: [AuthGuardService],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TeaDetailsPageRoutingModule {}
