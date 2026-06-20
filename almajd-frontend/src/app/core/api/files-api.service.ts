import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from './api-response';
import { environment } from '../../../environments/environment';

export interface FileUploadResultDto {
  url: string;
}

export type UploadSubfolder = 'BrandLogos' | 'CategoryImages' | 'ProfileImages';

@Injectable({ providedIn: 'root' })
export class FilesApiService {
  constructor(private api: ApiService) {}

  upload(file: File, subfolder: UploadSubfolder): Observable<ApiResponse<FileUploadResultDto>> {
    const form = new FormData();
    form.append('file', file);
    form.append('subfolder', subfolder);
    return this.api.postForm<FileUploadResultDto>('/api/files/upload', form);
  }

  /** Compose an absolute URL from a relative server path like "/BrandLogos/abc.png". */
  toAbsolute(relativePath: string | null | undefined): string | null {
    if (!relativePath) return null;
    if (/^https?:\/\//i.test(relativePath)) return relativePath;
    return `${environment.apiUrl}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
  }
}
