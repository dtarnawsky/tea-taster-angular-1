import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from '@app/core';
import { TastingNotesPage } from './tasting-notes.page';

const routes: Routes = [
  {
    path: '',
    component: TastingNotesPage,
    canActivate: [AuthGuardService],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TastingNotesPageRoutingModule {}
