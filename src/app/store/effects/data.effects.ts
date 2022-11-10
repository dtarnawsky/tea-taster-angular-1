import { Injectable } from '@angular/core';
import { TastingNotesService, TeaService } from '@app/core';
import {
  initialLoadFailure,
  initialLoadSuccess,
  loginSuccess,
  noteDeleted,
  noteDeletedFailure,
  noteDeletedSuccess,
  noteSaved,
  noteSavedFailure,
  noteSavedSuccess,
  notesPageLoaded,
  notesPageLoadedFailure,
  notesPageLoadedSuccess,
  sessionRestored,
  teaDetailsChangeRating,
  teaDetailsChangeRatingFailure,
  teaDetailsChangeRatingSuccess,
} from '@app/store/actions';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';

@Injectable()
export class DataEffects {
  sessionLoaded$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loginSuccess, sessionRestored),
      mergeMap(() =>
        this.teaService.getAll().pipe(
          map((teas) => initialLoadSuccess({ teas })),
          catchError(() =>
            of(
              initialLoadFailure({
                errorMessage: 'Error in data load, check server logs',
              })
            )
          )
        )
      )
    )
  );

  teaRatingChanged$ = createEffect(() =>
    this.actions$.pipe(
      ofType(teaDetailsChangeRating),
      mergeMap((action) =>
        from(this.teaService.save({ ...action.tea, rating: action.rating })).pipe(
          map(() =>
            teaDetailsChangeRatingSuccess({
              tea: { ...action.tea, rating: action.rating },
            })
          ),
          catchError((err) =>
            of(
              teaDetailsChangeRatingFailure({
                errorMessage: err.message || 'Unknown error in rating save',
              })
            )
          )
        )
      )
    )
  );

  notesPageLoaded$ = createEffect(() =>
    this.actions$.pipe(
      ofType(notesPageLoaded),
      mergeMap(() =>
        this.tastingNotesService.getAll().pipe(
          map((notes) => notesPageLoadedSuccess({ notes })),
          catchError(() =>
            of(
              notesPageLoadedFailure({
                errorMessage: 'Error in data load, check server logs',
              })
            )
          )
        )
      )
    )
  );

  noteSaved$ = createEffect(() =>
    this.actions$.pipe(
      ofType(noteSaved),
      mergeMap((action) =>
        this.tastingNotesService.save(action.note).pipe(
          map((note) => noteSavedSuccess({ note })),
          catchError(() =>
            of(
              noteSavedFailure({
                errorMessage: 'Error in data load, check server logs',
              })
            )
          )
        )
      )
    )
  );

  noteDeleted$ = createEffect(() =>
    this.actions$.pipe(
      ofType(noteDeleted),
      mergeMap((action) =>
        this.tastingNotesService.delete(action.note.id).pipe(
          map(() => noteDeletedSuccess({ note: action.note })),
          catchError(() =>
            of(
              noteDeletedFailure({
                errorMessage: 'Error in data load, check server logs',
              })
            )
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private tastingNotesService: TastingNotesService,
    private teaService: TeaService
  ) {}
}
