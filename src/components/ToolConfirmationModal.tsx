/**
 * ToolConfirmationModal - Modal for approving/denying tool execution
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Chip,
  Alert,
  Divider,
} from '@mui/material';
import {
  Build as ToolIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface ToolConfirmationModalProps {
  open: boolean;
  toolName: string;
  description: string;
  parameters: Record<string, unknown>;
  preview?: string;
  onApprove: () => void;
  onDeny: () => void;
  onAlwaysAllow?: () => void;
}

// Tools that are considered risky
const RISKY_TOOLS = [
  'run_shell_command',
  'shell',
  'exec',
  'execute',
  'rm',
  'delete',
  'write_file',
  'modify',
];

export default function ToolConfirmationModal({
  open,
  toolName,
  description,
  parameters,
  preview,
  onApprove,
  onDeny,
  onAlwaysAllow,
}: ToolConfirmationModalProps) {
  const isRisky = RISKY_TOOLS.some(
    (risky) => toolName.toLowerCase().includes(risky)
  );

  // Format parameters for display
  const formatValue = (value: unknown): string => {
    if (typeof value === 'string') {
      return value.length > 200 ? value.substring(0, 200) + '...' : value;
    }
    return JSON.stringify(value, null, 2);
  };

  return (
    <Dialog
      open={open}
      onClose={onDeny}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderTop: isRisky ? '4px solid #ff9800' : '4px solid #2196f3',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ToolIcon color={isRisky ? 'warning' : 'primary'} />
        <Typography variant="h6" component="span">
          Tool Execution Request
        </Typography>
        {isRisky && (
          <Chip
            icon={<WarningIcon />}
            label="Potentially Risky"
            color="warning"
            size="small"
            sx={{ ml: 'auto' }}
          />
        )}
      </DialogTitle>

      <Divider />

      <DialogContent>
        {/* Tool Name */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Tool Name
          </Typography>
          <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
            {toolName}
          </Typography>
        </Box>

        {/* Description */}
        {description && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary">
              Description
            </Typography>
            <Typography variant="body2">{description}</Typography>
          </Box>
        )}

        {/* Parameters */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Parameters
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: 'background.default',
              maxHeight: 200,
              overflow: 'auto',
            }}
          >
            {Object.keys(parameters).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No parameters
              </Typography>
            ) : (
              Object.entries(parameters).map(([key, value]) => (
                <Box key={key} sx={{ mb: 1 }}>
                  <Typography
                    variant="caption"
                    color="primary"
                    sx={{ fontWeight: 'bold' }}
                  >
                    {key}:
                  </Typography>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      m: 0,
                      ml: 1,
                    }}
                  >
                    {formatValue(value)}
                  </Typography>
                </Box>
              ))
            )}
          </Paper>
        </Box>

        {/* Preview (e.g., file diff) */}
        {preview && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary">
              Preview
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: '#1e1e1e',
                color: '#d4d4d4',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <Typography
                component="pre"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap',
                  m: 0,
                }}
              >
                {preview}
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Warning for risky tools */}
        {isRisky && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              This tool can make changes to your system. Please review the
              parameters carefully before approving.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {onAlwaysAllow && (
          <Button onClick={onAlwaysAllow} color="info" variant="text">
            Always Allow
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          onClick={onDeny}
          color="error"
          variant="outlined"
          startIcon={<CloseIcon />}
        >
          Deny
        </Button>
        <Button
          onClick={onApprove}
          color="success"
          variant="contained"
          startIcon={<CheckIcon />}
          autoFocus
        >
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
