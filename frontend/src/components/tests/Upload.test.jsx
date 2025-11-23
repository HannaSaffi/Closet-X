//frontend/src/components/tests/Upload.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Upload from '../Upload';

// Mock fetch
global.fetch = jest.fn();

const MockedUpload = () => (
  <BrowserRouter>
    <Upload />
  </BrowserRouter>
);

describe('Upload Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders upload interface', () => {
    render(<MockedUpload />);
    
    expect(screen.getByText(/upload/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('renders file input', () => {
    render(<MockedUpload />);
    
    const fileInput = screen.getByLabelText(/choose file|select file|upload image/i);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
  });

  test('handles file selection', async () => {
    render(<MockedUpload />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText(/choose file|select file|upload image/i);
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/test.png/i)).toBeInTheDocument();
    });
  });

  test('shows error for invalid file type', async () => {
    render(<MockedUpload />);
    
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose file|select file|upload image/i);
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/invalid file type|please upload an image/i)).toBeInTheDocument();
    });
  });

  test('shows error for file too large', async () => {
    render(<MockedUpload />);
    
    // Create a mock file that's too large (>5MB)
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    const input = screen.getByLabelText(/choose file|select file|upload image/i);
    
    fireEvent.change(input, { target: { files: [largeFile] } });
    
    await waitFor(() => {
      expect(screen.getByText(/file too large|maximum file size/i)).toBeInTheDocument();
    });
  });

  test('submits form successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        clothingId: '123', 
        imageUrl: 'https://example.com/image.jpg' 
      })
    });

    render(<MockedUpload />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText(/choose file|select file|upload image/i);
    const submitButton = screen.getByRole('button', { name: /upload|submit/i });
    
    fireEvent.change(input, { target: { files: [file] } });
    
    // Fill in additional fields if they exist
    const categoryInput = screen.queryByLabelText(/category/i);
    if (categoryInput) {
      fireEvent.change(categoryInput, { target: { value: 'shirt' } });
    }
    
    const colorInput = screen.queryByLabelText(/color/i);
    if (colorInput) {
      fireEvent.change(colorInput, { target: { value: 'blue' } });
    }
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/success|uploaded successfully/i)).toBeInTheDocument();
    });
    
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/clothes'),
      expect.objectContaining({
        method: 'POST'
      })
    );
  });

  test('shows loading state during upload', async () => {
    fetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ clothingId: '123' })
      }), 1000))
    );

    render(<MockedUpload />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText(/choose file|select file|upload image/i);
    const submitButton = screen.getByRole('button', { name: /upload|submit/i });
    
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(submitButton);
    
    expect(screen.getByText(/uploading|loading/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText(/uploading|loading/i)).not.toBeInTheDocument();
    });
  });

  test('handles upload errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<MockedUpload />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText(/choose file|select file|upload image/i);
    const submitButton = screen.getByRole('button', { name: /upload|submit/i });
    
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/error|failed|try again/i)).toBeInTheDocument();
    });
  });

  test('handles server errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' })
    });

    render(<MockedUpload />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText(/choose file|select file|upload image/i);
    const submitButton = screen.getByRole('button', { name: /upload|submit/i });
    
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/error|failed|server error/i)).toBeInTheDocument();
    });
  });

  test('allows clearing selected file', async () => {
    render(<MockedUpload />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText(/choose file|select file|upload image/i);
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/test.png/i)).toBeInTheDocument();
    });
    
    const clearButton = screen.queryByRole('button', { name: /clear|remove|cancel/i });
    if (clearButton) {
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/test.png/i)).not.toBeInTheDocument();
      });
    }
  });

  test('shows image preview when available', async () => {
    render(<MockedUpload />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText(/choose file|select file|upload image/i);
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      const preview = screen.queryByAltText(/preview/i);
      if (preview) {
        expect(preview).toBeInTheDocument();
        expect(preview).toHaveAttribute('src');
      }
    });
  });

  test('validates required fields before submission', async () => {
    render(<MockedUpload />);
    
    const submitButton = screen.getByRole('button', { name: /upload|submit/i });
    
    // Try to submit without selecting a file
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please select|required|choose a file/i)).toBeInTheDocument();
    });
    
    expect(fetch).not.toHaveBeenCalled();
  });

  test('includes authentication token in request', async () => {
    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => 'fake-auth-token');

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ clothingId: '123' })
    });

    render(<MockedUpload />);
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText(/choose file|select file|upload image/i);
    const submitButton = screen.getByRole('button', { name: /upload|submit/i });
    
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );
    });
  });
});
