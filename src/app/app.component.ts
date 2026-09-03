import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Link, SnipApiService } from './snip-api.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly api = inject(SnipApiService);
  readonly links = signal<Link[]>([]);
  readonly error = signal('');
  readonly createdLink = signal<Link | null>(null);
  url = '';
  loading = signal(false);

  constructor() {
    this.loadLinks();
  }

  submit(): void {
    this.error.set('');
    this.createdLink.set(null);
    if (!this.isHttpUrl(this.url)) {
      this.error.set('Please enter a valid http:// or https:// URL.');
      return;
    }

    this.loading.set(true);
    this.api.createLink(this.url).subscribe({
      next: (link) => {
        this.createdLink.set(link);
        this.url = '';
        this.loading.set(false);
        this.loadLinks();
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  private loadLinks(): void {
    this.api.getLinks().subscribe({
      next: (links) => this.links.set(links),
      error: () => this.error.set('Unable to load links. Is the backend running?'),
    });
  }

  private isHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
