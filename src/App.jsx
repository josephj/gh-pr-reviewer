import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Box,
  Center,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  Link,
  Progress,
  Stack,
  Text,
  Textarea,
  useBoolean,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { diff } from 'react-syntax-highlighter/dist/esm/languages/hljs';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

SyntaxHighlighter.registerLanguage('diff', diff);

import { fetchDetails } from './utils.js';

export const App = () => {
  const [isModelReady, setModelReady] = useState(null);
  const [isModelLoading, setModelLoading] = useState(false);
  const [progressItems, setProgressItems] = useState([]);
  const [isSubmitting, setSubmitting] = useBoolean();

  const { register, handleSubmit, setValue } = useForm();

  const toast = useToast();

  // Inputs and outputs
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const worker = useRef(null);
  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module',
      });
    }
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case 'initiate':
          setModelReady(false);
          setProgressItems((prev) => [...prev, e.data]);
          break;
        case 'progress':
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, progress: e.data.progress };
              }
              return item;
            })
          );
          break;
        case 'done':
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file)
          );
          break;
        case 'ready':
          setModelReady(true);
          break;
        case 'update':
          setOutput(e.data.output);
          break;
        case 'complete':
          setModelLoading(false);
          break;
      }
    };
    worker.current.addEventListener('message', onMessageReceived);
    return () => {
      worker.current.removeEventListener('message', onMessageReceived);
    };
  });

  useEffect(() => {
    // Load saved data from localStorage
    const savedUrl = localStorage.getItem('githubPrUrl');
    const savedToken = localStorage.getItem('githubToken');
    if (savedUrl) setValue('githubPrUrl', savedUrl);
    if (savedToken) setValue('githubToken', savedToken);
  }, [setValue]);

  const onSubmit = async (data) => {
    setModelLoading(true);
    setSubmitting.on();

    localStorage.setItem('githubPrUrl', data.githubPrUrl);
    localStorage.setItem('githubToken', data.githubToken);
    localStorage.setItem('baseOwner', data.baseOwner);
    localStorage.setItem('baseRepo', data.baseRepo);
    toast({
      title: 'Data saved.',
      description: "We've saved your GitHub details.",
      status: 'success',
      duration: 5000,
      isClosable: true,
    });

    try {
      const { diffContent } = await fetchDetails(
        data.githubPrUrl,
        data.githubToken
      );
      setInput(diffContent);
      worker.current.postMessage({
        text: diffContent,
      });
    } catch (error) {
      console.log('=>(App.js:142) error', error);
      toast({
        title: 'Error fetching PR details.',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSubmitting.off();
    }
  };

  return (
    <Center>
      <VStack spacing="50px" p={4} width={['100%', '800px']}>
        <Heading variant="h1">ML-powered code reviewer</Heading>

        <Box as="form" onSubmit={handleSubmit(onSubmit)} width="100%">
          <FormControl isRequired marginBottom={4}>
            <FormLabel htmlFor="githubPrUrl">GitHub PR URL</FormLabel>
            <Input
              id="githubPrUrl"
              type="url"
              {...register('githubPrUrl', { required: true })}
            />
          </FormControl>

          <FormControl isRequired marginBottom={4}>
            <FormLabel htmlFor="githubToken">GitHub Token</FormLabel>
            <Input
              id="githubToken"
              type="text"
              {...register('githubToken', { required: true })}
            />
            <FormHelperText>
              You can get your Github token here:{' '}
              <Link
                color="blue.500"
                href="https://github.com/settings/tokens/new"
                isExternal
              >
                Github Token
              </Link>
            </FormHelperText>
          </FormControl>

          <Stack spacing="10px" width="100%">
            <Center>
              <Button
                mt={4}
                colorScheme="blue"
                type="submit"
                isLoading={isSubmitting}
                isDisabled={isModelLoading}
                loadingText="Analyzing"
              >
                {!isModelReady ? 'Loading models (One time)' : 'Analyze'}
              </Button>
            </Center>
            {progressItems.map((data) => (
              <HStack key={data.file} width="100%">
                <Text fontSize="xx-small" width="300px">
                  {data.file}
                </Text>
                <Progress
                  size="md"
                  text={data.file}
                  value={data.progress}
                  width="100%"
                />
              </HStack>
            ))}
          </Stack>
        </Box>

        <Grid
          templateColumns="repeat(2, 1fr)"
          gap={6}
          width="100%"
          height="500px"
        >
          <GridItem textAlign="left" fontSize="xx-small" overflow="auto">
            <Box height="500px" width="100%">
              <SyntaxHighlighter
                language="javascript"
                style={docco}
                height="100%"
              >
                {input}
              </SyntaxHighlighter>
            </Box>
          </GridItem>
          <GridItem>
            <Textarea
              height="500px"
              value={output}
              rows={10}
              readOnly
            ></Textarea>
          </GridItem>
        </Grid>
      </VStack>
    </Center>
  );
};
