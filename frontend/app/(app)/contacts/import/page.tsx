'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Upload, CheckCircle2, XCircle, AlertCircle, Download } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useMutation } from '@tanstack/react-query';

interface CSVRow {
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  country?: string;
  errors?: string[];
}

export default function ImportContactsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<CSVRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    duplicates: number;
  } | null>(null);

  const importMutation = useMutation({
    mutationFn: async (data: CSVRow[]) => {
      const response = await apiClient.post('/contacts/import', { contacts: data });
      return response.data;
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreviewData([]);
    setValidationErrors([]);
    setImportResults(null);

    // Parse CSV
    const text = await selectedFile.text();
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length === 0) {
      setValidationErrors(['CSV file is empty']);
      return;
    }

    // Parse header
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const phoneIndex = headers.findIndex((h) => h === 'phone' || h === 'phonenumber');
    const firstNameIndex = headers.findIndex((h) => h === 'firstname' || h === 'first');
    const lastNameIndex = headers.findIndex((h) => h === 'lastname' || h === 'last');
    const emailIndex = headers.findIndex((h) => h === 'email');
    const cityIndex = headers.findIndex((h) => h === 'city');
    const stateIndex = headers.findIndex((h) => h === 'state');
    const countryIndex = headers.findIndex((h) => h === 'country');

    if (phoneIndex === -1) {
      setValidationErrors(['CSV must contain a "phone" column']);
      return;
    }

    // Parse rows
    const rows: CSVRow[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: CSVRow = {
        phone: values[phoneIndex] || '',
        firstName: firstNameIndex !== -1 ? values[firstNameIndex] : undefined,
        lastName: lastNameIndex !== -1 ? values[lastNameIndex] : undefined,
        email: emailIndex !== -1 ? values[emailIndex] : undefined,
        city: cityIndex !== -1 ? values[cityIndex] : undefined,
        state: stateIndex !== -1 ? values[stateIndex] : undefined,
        country: countryIndex !== -1 ? values[countryIndex] : undefined,
        errors: [],
      };

      // Validate phone
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      const cleanedPhone = row.phone.replace(/\D/g, '');
      if (!cleanedPhone || cleanedPhone.length < 10) {
        row.errors?.push('Invalid phone number');
      } else {
        row.phone = cleanedPhone;
      }

      // Validate email if provided
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        row.errors?.push('Invalid email format');
      }

      if (row.errors && row.errors.length > 0) {
        errors.push(`Row ${i + 1}: ${row.errors.join(', ')}`);
      }

      rows.push(row);
    }

    setPreviewData(rows);
    setValidationErrors(errors);
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    setIsProcessing(true);
    try {
      const validRows = previewData.filter((row) => !row.errors || row.errors.length === 0);
      const result = await importMutation.mutateAsync(validRows);
      setImportResults(result);
    } catch (error: any) {
      let errorMessage = 'Import failed';
      
      try {
        if (error?.response?.data) {
          const errorData = error.response.data;
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData?.message) {
            // Handle array of messages (NestJS validation errors)
            if (Array.isArray(errorData.message)) {
              errorMessage = errorData.message.join(', ');
            } else if (typeof errorData.message === 'string') {
              errorMessage = errorData.message;
            }
          }
        } else if (error?.message && typeof error.message === 'string') {
          errorMessage = error.message;
        }
      } catch (parseError) {
        errorMessage = 'Import failed. Please try again.';
      }
      
      setValidationErrors([
        ...validationErrors,
        errorMessage,
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = `firstName,lastName,phone,email,city,state,country
John,Doe,15551234567,john@example.com,New York,NY,USA
Jane,Smith,15559876543,jane@example.com,Los Angeles,CA,USA`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Import Contacts</h1>
            <p className="text-muted-foreground">Upload a CSV file to import contacts</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Format</CardTitle>
          <CardDescription>
            Your CSV file should include the following columns (phone is required)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Badge variant="outline" className="mb-2">Required</Badge>
              <p className="text-sm font-medium">phone</p>
            </div>
            <div>
              <Badge variant="secondary" className="mb-2">Optional</Badge>
              <p className="text-sm font-medium">firstName</p>
            </div>
            <div>
              <Badge variant="secondary" className="mb-2">Optional</Badge>
              <p className="text-sm font-medium">lastName</p>
            </div>
            <div>
              <Badge variant="secondary" className="mb-2">Optional</Badge>
              <p className="text-sm font-medium">email</p>
            </div>
            <div>
              <Badge variant="secondary" className="mb-2">Optional</Badge>
              <p className="text-sm font-medium">city</p>
            </div>
            <div>
              <Badge variant="secondary" className="mb-2">Optional</Badge>
              <p className="text-sm font-medium">state</p>
            </div>
            <div>
              <Badge variant="secondary" className="mb-2">Optional</Badge>
              <p className="text-sm font-medium">country</p>
            </div>
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>Select a CSV file to import contacts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              {file ? file.name : 'No file selected'}
            </p>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              {file ? 'Change File' : 'Select CSV File'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Validation Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-destructive">
                  {error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  {previewData.length} contact{previewData.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              <Button
                onClick={handleImport}
                disabled={isProcessing || validationErrors.length > 0}
              >
                {isProcessing ? 'Importing...' : `Import ${previewData.length} Contacts`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 50).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {row.firstName || ''} {row.lastName || ''}
                      </TableCell>
                      <TableCell>{row.phone}</TableCell>
                      <TableCell>{row.email || '—'}</TableCell>
                      <TableCell>
                        {row.city || ''}
                        {row.city && row.state ? ', ' : ''}
                        {row.state || ''}
                      </TableCell>
                      <TableCell>
                        {row.errors && row.errors.length > 0 ? (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        ) : (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {previewData.length > 50 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Showing first 50 rows. {previewData.length - 50} more rows will be imported.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults && (
        <Card className="border-success">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Successfully imported:</span>
                <span className="font-medium text-success">{importResults.success}</span>
              </div>
              {importResults.duplicates > 0 && (
                <div className="flex justify-between">
                  <span>Duplicates skipped:</span>
                  <span className="font-medium">{importResults.duplicates}</span>
                </div>
              )}
              {importResults.failed > 0 && (
                <div className="flex justify-between">
                  <span>Failed:</span>
                  <span className="font-medium text-destructive">{importResults.failed}</span>
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/contacts">
                <Button>View Contacts</Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setPreviewData([]);
                  setValidationErrors([]);
                  setImportResults(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Import More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

