import { Component, OnInit } from '@angular/core';
import { TastingNote } from '@app/models';
import { selectNotes } from '@app/store';
import { noteDeleted, notesPageLoaded } from '@app/store/actions';
import { IonRouterOutlet, ModalController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { TastingNoteEditorComponent } from './tasting-note-editor/tasting-note-editor.component';

@Component({
  selector: 'app-tasting-notes',
  templateUrl: './tasting-notes.page.html',
  styleUrls: ['./tasting-notes.page.scss'],
})
export class TastingNotesPage implements OnInit {
  notes$: Observable<Array<TastingNote>>;

  constructor(private modalController: ModalController, private routerOutlet: IonRouterOutlet, private store: Store) {}

  ngOnInit() {
    this.store.dispatch(notesPageLoaded());
    this.notes$ = this.store.select(selectNotes);
  }

  newNote(): Promise<void> {
    return this.displayEditor();
  }

  updateNote(note: TastingNote): Promise<void> {
    return this.displayEditor(note);
  }

  deleteNote(note: TastingNote): void {
    this.store.dispatch(noteDeleted({ note }));
  }

  private async displayEditor(note?: TastingNote): Promise<void> {
    const opt = {
      component: TastingNoteEditorComponent,
      backdropDismiss: false,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl,
    };

    const modal = note
      ? await this.modalController.create({ ...opt, componentProps: { note } })
      : await this.modalController.create(opt);
    await modal.present();
  }
}
