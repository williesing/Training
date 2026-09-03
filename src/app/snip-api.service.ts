import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

export interface Link {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SnipApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  getLinks(): Observable<Link[]> {
    return this.http.get<Link[]>(`${this.baseUrl}/api/links`).pipe(catchError(this.handleError));
  }

  createLink(url: string): Observable<Link> {
    return this.http.post<Link>(`${this.baseUrl}/api/links`, { url }).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    const message = error.error?.error || 'A network error occurred. Please try again.';
    return throwError(() => new Error(message));
  }
}
