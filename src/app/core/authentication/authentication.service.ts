import { Injectable } from '@angular/core';
import { Session } from '@app/models';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { map } from 'rxjs/operators';

interface LoginResponse extends Session {
  success: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<Session | undefined> {
    return this.http.post<Session>(`${environment.dataService}/login`, { username: email, password }).pipe(
      map((res: LoginResponse) => {
        const { success, ...session } = res;
        if (success) {
          return session;
        }
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${environment.dataService}/logout`, {});
  }
}
