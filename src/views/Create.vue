<script setup lang="ts">
import { ref, reactive, computed, watch, Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useActions } from '@/composables/useActions';
import { useWeb3 } from '@/composables/useWeb3';
import { clone } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import type { StrategyConfig } from '@/networks/types';
import type { NetworkID, SpaceMetadata, SpaceSettings } from '@/types';

const PAGES = [
  {
    id: 'profile',
    title: 'Profile'
  },
  {
    id: 'network',
    title: 'Network'
  },
  {
    id: 'strategies',
    title: 'Strategies'
  },
  {
    id: 'auths',
    title: 'Auths'
  },
  {
    id: 'executions',
    title: 'Executions'
  },
  {
    id: 'voting',
    title: 'Voting'
  },
  {
    id: 'controller',
    title: 'Controller'
  }
] as const;

type PageID = typeof PAGES[number]['id'];

const router = useRouter();
const { createSpace } = useActions();
const { web3 } = useWeb3();

const pagesRefs = ref([] as HTMLElement[]);
const showPicker = ref(false);
const searchValue = ref('');
const sending = ref(false);
const currentPage: Ref<PageID> = ref('profile');
const pagesErrors: Ref<Record<PageID, Record<string, string>>> = ref({
  profile: {},
  network: {},
  strategies: {},
  auths: {},
  executions: {},
  voting: {},
  controller: {}
});
const metadataForm: SpaceMetadata = reactive(
  clone({
    name: '',
    description: '',
    externalUrl: '',
    twitter: '',
    github: '',
    discord: '',
    walletNetwork: null,
    walletAddress: null
  })
);
const selectedNetworkId: Ref<NetworkID> = ref('gor');
const authenticators = ref([] as StrategyConfig[]);
const votingStrategies = ref([] as StrategyConfig[]);
const executionStrategies = ref([] as StrategyConfig[]);
const settingsForm: SpaceSettings = reactive(
  clone({
    votingDelay: 0,
    minVotingDuration: 0,
    maxVotingDuration: 86400,
    proposalThreshold: '1',
    quorum: '1'
  })
);
const controller = ref(web3.value.account);

const selectedNetwork = computed(() => getNetwork(selectedNetworkId.value));
const accessiblePages = computed(() => {
  const invalidPageIndex = PAGES.findIndex(page => !validatePage(page.id));

  return Object.fromEntries(
    PAGES.map((page, i) => [page.id, invalidPageIndex === -1 ? true : i <= invalidPageIndex])
  );
});
const showCreate = computed(
  () => PAGES.findIndex(page => page.id === currentPage.value) === PAGES.length - 1
);
const nextDisabled = computed(() => !validatePage(currentPage.value));
const submitDisabled = computed(() => PAGES.some(page => !validatePage(page.id)));

function validatePage(page: PageID) {
  if (page === 'strategies') return votingStrategies.value.length > 0;
  if (page === 'auths') return authenticators.value.length > 0;
  if (page === 'executions') return executionStrategies.value.length > 0;

  return Object.values(pagesErrors.value[page]).length === 0;
}

function handleErrors(page: PageID, errors: any) {
  pagesErrors.value[page] = errors;
}

function handleNextClick() {
  const currentIndex = PAGES.findIndex(page => page.id === currentPage.value);
  if (currentIndex === PAGES.length - 1) return;

  currentPage.value = PAGES[currentIndex + 1].id;
  pagesRefs.value[currentIndex + 1].scrollIntoView();
}

function handlePickerSelect(value: string) {
  showPicker.value = false;
  metadataForm.walletAddress = value;
}

async function handleSubmit() {
  sending.value = true;

  try {
    const result = await createSpace(
      selectedNetworkId.value,
      metadataForm,
      settingsForm,
      authenticators.value,
      votingStrategies.value,
      executionStrategies.value
    );

    if (result) router.back();
  } finally {
    sending.value = false;
  }
}

watch(
  () => web3.value.account,
  value => {
    if (!controller.value && value) {
      controller.value = value;
    }
  }
);

watch(selectedNetworkId, () => {
  authenticators.value = [];
  votingStrategies.value = [];
  executionStrategies.value = [];
});
</script>

<template>
  <div>
    <div class="pt-5 flex max-w-[50rem] mx-auto px-4">
      <div
        class="flex fixed lg:sticky top-[72px] inset-x-0 p-3 border-b z-10 bg-skin-bg lg:top-auto lg:inset-x-auto lg:p-0 lg:pr-5 lg:border-0 lg:flex-col gap-1 min-w-[180px] overflow-auto"
      >
        <button
          v-for="page in PAGES"
          ref="pagesRefs"
          :key="page.id"
          :disabled="!accessiblePages[page.id]"
          class="px-3 py-1 block lg:w-full rounded text-left scroll-mr-3 first:ml-auto last:mr-auto"
          :class="{
            'bg-skin-active': page.id === currentPage,
            'hover:bg-skin-hover': page.id !== currentPage
          }"
          @click="currentPage = page.id"
        >
          {{ page.title }}
        </button>
      </div>
      <div class="flex-1">
        <div class="mt-8 lg:mt-0">
          <BlockSpaceFormProfile
            v-if="currentPage === 'profile'"
            :form="metadataForm"
            @pick="showPicker = true"
            @no-network="metadataForm.walletAddress = null"
            @errors="v => handleErrors('profile', v)"
          />
          <BlockSpaceFormNetwork
            v-else-if="currentPage === 'network'"
            v-model="selectedNetworkId"
          />
          <BlockSpaceFormStrategies
            v-else-if="currentPage === 'strategies'"
            v-model="votingStrategies"
            :available-strategies="selectedNetwork.constants.EDITOR_VOTING_STRATEGIES"
            title="Voting strategies"
            description="Lorem ipsum..."
          />
          <BlockSpaceFormStrategies
            v-else-if="currentPage === 'auths'"
            v-model="authenticators"
            :available-strategies="selectedNetwork.constants.EDITOR_AUTHENTICATORS"
            title="Authenticators"
            description="Lorem ipsum..."
          />
          <BlockSpaceFormStrategies
            v-else-if="currentPage === 'executions'"
            v-model="executionStrategies"
            :available-strategies="selectedNetwork.constants.EDITOR_EXECUTION_STRATEGIES"
            title="Execution strategies"
            description="Lorem ipsum..."
          />
          <BlockSpaceFormVoting
            v-else-if="currentPage === 'voting'"
            :form="settingsForm"
            :selected-network-id="selectedNetworkId"
            @errors="v => handleErrors('voting', v)"
          />
          <BlockSpaceFormController
            v-else-if="currentPage === 'controller'"
            v-model="controller"
            @errors="v => handleErrors('controller', v)"
          />
        </div>

        <UiButton
          v-if="showCreate"
          class="w-full"
          :loading="sending"
          :disabled="submitDisabled"
          @click="handleSubmit"
        >
          Create
        </UiButton>
        <UiButton v-else class="w-full" :disabled="nextDisabled" @click="handleNextClick">
          Next
        </UiButton>
      </div>
    </div>
    <teleport to="#modal">
      <UiModal :open="showPicker" @close="showPicker = false">
        <template #header>
          <h3>Select contact</h3>
          <a class="absolute left-0 -top-1 p-4 text-color" @click="showPicker = false">
            <IH-arrow-narrow-left class="mr-2" />
          </a>
          <div class="flex items-center border-t px-2 py-3 mt-3 -mb-3">
            <IH-search class="mx-2" />
            <input
              ref="searchInput"
              v-model="searchValue"
              type="text"
              placeholder="Search"
              class="flex-auto bg-transparent text-skin-link"
            />
          </div>
        </template>
        <BlockContactPicker
          :loading="false"
          :search-value="searchValue"
          @pick="handlePickerSelect"
        />
      </UiModal>
    </teleport>
  </div>
</template>
